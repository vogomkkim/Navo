import { FastifyRequest, FastifyReply } from "fastify";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db/db.js";
import {
  events,
  projects,
  componentDefinitions,
  pages,
  components,
} from "../db/schema.js";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { scaffoldProject } from "../nodes/scaffoldProject.js"; // Added import
import { MasterDeveloperAgent } from "../agents/masterDeveloperAgent.js";
import { ProjectRequest } from "../core/masterDeveloper.js";
import { ProjectArchitectAgent } from "../agents/projectArchitectAgent.js";
import { CodeGeneratorAgent } from "../agents/codeGeneratorAgent.js";
import { DevelopmentGuideAgent } from "../agents/developmentGuideAgent.js";
import { UIUXDesignerAgent } from "../agents/uiuxDesignerAgent.js";
import { refineJsonResponse, safeJsonParse } from "../utils/jsonRefiner.js";
import { contextManager, UserContext } from "../core/contextManager.js";
import { promptEnhancer, EnhancedPrompt } from "../core/promptEnhancer.js";
import { actionRouter, ActionResult } from "../core/actionRouter.js";
import { v4 as uuidv4 } from "uuid";

import createDOMPurify from "dompurify";

// FastifyRequest 타입 확장
declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

// Initialize DOMPurify
const purify = createDOMPurify(); // Initialize without arguments for Node.js

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Utility: Create a URL/DB safe name from free text
 */
function slugifyName(input: string): string {
  const base = (input || "custom-component")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const clipped = base.slice(0, 48) || "component";
  return clipped.replace(/^-+|-+$/g, "") || "component";
}

/**
 * Validate a generated component definition object minimally
 */
function validateGeneratedComponentDef(obj: any): {
  ok: boolean;
  error?: string;
} {
  if (!obj || typeof obj !== "object")
    return { ok: false, error: "Invalid object" };
  const requiredStringFields = ["name", "display_name", "render_template"];
  for (const f of requiredStringFields) {
    if (typeof obj[f] !== "string" || obj[f].trim() === "") {
      return { ok: false, error: `Missing or invalid field: ${f}` };
    }
  }
  if (obj.css_styles != null && typeof obj.css_styles !== "string") {
    return { ok: false, error: "css_styles must be a string if provided" };
  }
  if (obj.props_schema != null && typeof obj.props_schema !== "object") {
    return { ok: false, error: "props_schema must be an object if provided" };
  }
  return { ok: true };
}

function sanitizeLayout(layout: any): any {
  if (!layout) return layout;

  const sanitizedLayout = JSON.parse(JSON.stringify(layout)); // Deep copy

  function traverse(obj: any) {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = purify.sanitize(obj[key]);
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        traverse(obj[key]);
      }
    }
  }
  traverse(sanitizedLayout);
  return sanitizedLayout;
}

/**
 * Build prompt for natural language -> component definition JSON
 */
function buildNlToComponentPrompt(description: string): string {
  return `You are a UI component generator for a low-code website builder.
Given the user's natural language description, produce a SINGLE component definition as compact JSON.
Constraints:
- Output ONLY pure JSON, no backticks, no explanations.
- Use mustache-style placeholders in HTML template: {{id}}, {{propName}}.
- Keep HTML semantic and accessible.
- Include minimal, scoped CSS as one string (no <style> tag).
- props_schema must be a JSON Schema object describing editable props.

Required JSON shape:
{
  "name": string,                 // machine-safe unique name, PascalCase or simple-kebab is ok
  "display_name": string,         // human friendly
  "description": string,          // short description
  "category": string,             // e.g., "basic", "forms", "media"
  "props_schema": {
    "type": "object",
    "properties": { /* keys for props used in the template */ }
  },
  "render_template": string,      // HTML with {{placeholders}}, include data-id="{{id}}"
  "css_styles": string            // CSS rules targeting classes used in template
}

User description:
${description}
`;
}

export async function handleAiCommand(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { command, projectId } = request.body as any;
    const userId = request.userId;

    if (!command) {
      reply.status(400).send({ error: "Command is required" });
      return;
    }

    // Process AI command and generate response
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(command);
    const response = result.response;
    const text = response.text();

    // Store the AI interaction
    await db.insert(events).values({
      projectId: projectId || null,
      userId: userId!,
      eventType: "ai_command",
      eventData: { command, response: text },
    });

    reply.send({ response: text });
  } catch (error) {
    console.error("Error processing AI command:", error);
    reply.status(500).send({ error: "Failed to process AI command" });
  }
}

export async function generateAiSuggestion(currentLayout: any): Promise<any> {
  console.log("[AI] Entering generateAiSuggestion", { currentLayout });
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are an AI assistant that suggests improvements for web page layouts.
Analyze the provided currentLayout (a JSON object representing the page components).
Suggest ONE actionable improvement. The suggestion should be concise and focus on a single change.
The suggestion should be in the following JSON format:
{
  "type": "style" | "content" | "component", // Type of suggestion
  "content": { // The actual change to apply, matching the structure expected by the frontend
    "type": "update" | "add" | "remove",
    "id": "component_id", // If updating/removing
    "payload": { // The data for the change
      // e.g., for style update: { props: { style: { color: "blue" } } }
      // e.g., for content update: { props: { headline: "New Headline" } }
      // e.g., for add: { id: "new_id", type: "ComponentType", props: {} }
    },
    "description": "A brief, human-readable description of the suggestion."
  }
}

Example:
If the layout has a Header, suggest changing its background color.
If the layout has a Hero, suggest a different CTA text.

Current Layout: ${JSON.stringify(currentLayout, null, 2)}

Your suggestion:
`;

  try {
    console.log("[AI] Sending prompt to Gemini:", prompt);
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();
    console.log("[AI] Gemini Suggestion Raw Response:", text);

    let parsedSuggestion;
    try {
      if (text.startsWith("```json")) {
        text = text.replace(/```json\s*/, "").replace(/\s*```$/, "");
      }
      console.log("[AI] Attempting to parse Gemini response:", text);
      parsedSuggestion = JSON.parse(text);
      console.log(
        "[AI] Successfully parsed Gemini response.",
        parsedSuggestion
      );
    } catch (parseError) {
      console.error(
        "[AI] Failed to parse Gemini suggestion as JSON:",
        parseError
      );
      console.error("[AI] Raw Gemini suggestion text:", text);
      throw new Error("AI suggestion was not valid JSON.");
    }
    console.log("[AI] Exiting generateAiSuggestion - Success");
    return parsedSuggestion;
  } catch (err) {
    console.error("[AI] Error calling Gemini API for suggestion:", err);
    console.log("[AI] Exiting generateAiSuggestion - Failure");
    throw new Error("Failed to get suggestion from AI.");
  }
}

export async function handleGenerateProject(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectName, projectDescription, requirements } =
      request.body as any;
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: "Unauthorized" });
      return;
    }
    if (!projectName) {
      reply.status(400).send({ error: "Project name is required." });
      return;
    }

    // requirements가 있으면 저장, 없으면 projectDescription 사용
    const projectRequirements =
      requirements || projectDescription || projectName;

    const created = await db
      .insert(projects)
      .values({
        name: projectName as string,
        ownerId: userId!,
        description: projectDescription || projectName,
        requirements: projectRequirements,
      })
      .returning();

    const projectId = created[0].id;

    // AI를 사용하여 프로젝트 콘텐츠 생성
    console.log("프로젝트 생성 시 AI 콘텐츠 생성 시작...");
    const generatedContent = await generateProjectContent(projectRequirements);
    console.log("생성된 콘텐츠:", generatedContent);

    // 생성된 내용을 데이터베이스에 저장 (트랜잭션으로 안전하게 처리)
    console.log("페이지 및 컴포넌트 저장 시작...");

    const result = await db.transaction(async (tx) => {
      // 새 데이터 생성
      const savedPages = await saveGeneratedPagesWithTx(
        tx,
        projectId,
        generatedContent.pages
      );
      const savedComponentDefinitions = await saveGeneratedComponentsWithTx(
        tx,
        projectId,
        generatedContent.components
      );

      // pages에 components 인스턴스 배치
      const savedComponents = await savePageComponentsWithTx(
        tx,
        savedPages,
        savedComponentDefinitions
      );

      return { savedPages, savedComponents, savedComponentDefinitions };
    });

    console.log("저장된 페이지:", result.savedPages);
    console.log("저장된 컴포넌트:", result.savedComponents);

    reply.send({
      ok: true,
      message: "Project created with AI-generated content.",
      projectId: projectId,
      generatedStructure: {
        pages: result.savedPages,
        componentDefinitions: result.savedComponentDefinitions,
        components: result.savedComponents,
      },
    });
  } catch (error) {
    console.error("Error generating project:", error);
    reply.status(500).send({ error: "Failed to generate project" });
  }
}

/**
 * Multi-agent chat entrypoint: takes a natural language chat message,
 * converts it into a ProjectRequest, orchestrates MasterDeveloperAgent,
 * and returns a structured multi-agent response for the chat UI.
 */
export async function handleMultiAgentChat(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: "Unauthorized" });
      return;
    }

    const { message, context } = request.body as {
      message?: string;
      context?: {
        projectId?: string;
        sessionId?: string;
        userAgent?: string;
        url?: string;
      };
    };

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      reply.status(400).send({ error: "Message is required" });
      return;
    }

    // ContextManager를 사용하여 사용자 컨텍스트 조회 또는 생성
    let userContext: UserContext;
    try {
      userContext = await contextManager.getOrCreateContext(userId);
    } catch (error) {
      console.error("Error getting or creating user context:", error);
      throw new Error("Failed to get or create user context");
    }

    const sessionId = userContext.sessionId; // DB에서 생성된 UUID 사용

    // 최근 메시지 조회 (컨텍스트 구성용)
    const recentMessages = await contextManager.getMessages(sessionId, 3);

    // PromptEnhancer를 사용하여 메시지 향상
    const enhancedPrompt: EnhancedPrompt = await promptEnhancer.enhance(
      message,
      userContext,
      recentMessages
    );

    // 사용자 메시지를 대화 히스토리에 추가
    await contextManager.addMessage(
      sessionId,
      userId,
      "user",
      { message },
      undefined,
      undefined,
      {
        source: "multi_agent_chat",
        enhancedPrompt: enhancedPrompt,
      }
    );

    // ActionRouter를 사용하여 적절한 핸들러 선택 및 실행
    const selectedHandler = actionRouter.route(enhancedPrompt);
    const routingInfo = actionRouter.getRoutingInfo(enhancedPrompt);

    console.log(`라우팅 정보:`, {
      intent: enhancedPrompt.intent.type,
      target: enhancedPrompt.target.type,
      action: enhancedPrompt.action.type,
      selectedHandler: selectedHandler?.name,
      matchedRule: routingInfo.matchedRule?.description,
    });

    let actionResult: ActionResult;
    if (selectedHandler) {
      // 선택된 핸들러로 처리
      actionResult = await selectedHandler.execute(
        enhancedPrompt,
        userContext,
        sessionId
      );
    } else {
      // 기본 처리
      actionResult = {
        success: false,
        message: "적절한 핸들러를 찾을 수 없습니다.",
        error: "No handler found",
      };
    }

    // 모호한 표현인 경우 구체화 제안
    if (enhancedPrompt.intent.isVague && enhancedPrompt.intent.clarification) {
      console.log(`모호한 표현 감지: ${enhancedPrompt.originalMessage}`);
      console.log(`구체화 제안: ${enhancedPrompt.intent.clarification}`);
    }

    // ActionRouter 결과를 기반으로 프로젝트 요청 생성
    const req: ProjectRequest = await buildProjectRequestFromActionResult(
      actionResult,
      enhancedPrompt,
      userContext,
      sessionId
    );

    const agent = new MasterDeveloperAgent();
    const start = Date.now();

    // 컨텍스트 정보를 포함한 enhanced context
    const enhancedContext = {
      ...context,
      userId: userId,
      sessionId: sessionId,
      userContext: userContext,
      actionResult: actionResult,
    };

    const plan = await agent.execute(req, enhancedContext);
    const totalExecutionTime = Date.now() - start;

    // 동적으로 에이전트 결과 생성
    const agentResults = [
      {
        name: "Project Architect Agent",
        data: plan.architecture,
        action: "프로젝트 요구사항 분석 및",
      },
      {
        name: "UI/UX Designer Agent",
        data: plan.uiDesign,
        action: "UI/UX",
      },
      {
        name: "Code Generator Agent",
        data: plan.codeStructure,
        action: "프로젝트 코드 구조",
      },
      {
        name: "Development Guide Agent",
        data: plan.developmentGuide,
        action: "개발 가이드",
      },
    ];

    const agents = agentResults.map((result) => ({
      success: true,
      message: generateAgentSuccessMessage(result.name, result.action),
      agentName: result.name,
      status: "completed" as const,
      data: result.data,
    }));

    // 어시스턴트 응답을 대화 히스토리에 추가
    const assistantMessage = generateSummaryMessage(
      agents.length,
      agents.length
    );
    await contextManager.addMessage(
      sessionId,
      userId,
      "assistant",
      { message: assistantMessage },
      undefined,
      undefined,
      {
        agents: agents.length,
        totalExecutionTime,
        source: "multi_agent_chat",
        enhancedPrompt: enhancedPrompt,
      }
    );

    // 마지막 액션 업데이트
    await contextManager.updateLastAction(
      sessionId,
      userId,
      "multi_agent_chat",
      "project_generation",
      {
        success: true,
        agentsCount: agents.length,
      }
    );

    reply.send({
      success: true,
      agents,
      totalExecutionTime,
      summary: assistantMessage,
      sessionId: sessionId, // 클라이언트에 세션 ID 반환
      enhancedPrompt: {
        intent: enhancedPrompt.intent,
        target: enhancedPrompt.target,
        action: enhancedPrompt.action,
        enhancedMessage: enhancedPrompt.enhancedMessage,
        isVague: enhancedPrompt.intent.isVague,
        clarification: enhancedPrompt.intent.clarification,
      },
      actionRouter: {
        selectedHandler: selectedHandler?.name,
        matchedRule: routingInfo.matchedRule?.description,
        actionResult: {
          success: actionResult.success,
          message: actionResult.message,
          nextAction: actionResult.nextAction,
        },
      },
    });
  } catch (error) {
    console.error("Error handling multi-agent chat:", error);
    reply.status(500).send({
      success: false,
      agents: [
        {
          success: false,
          message: generateErrorMessage("Master Developer", error),
          agentName: "Master Developer",
          status: "error",
        },
      ],
      totalExecutionTime: 0,
      summary: generateSummaryMessage(1, 0),
    });
  }
}

function buildProjectRequestFromMessage(message: string): ProjectRequest {
  const lower = message.toLowerCase();
  let type: ProjectRequest["type"] = "web";
  if (lower.includes("mobile") || lower.includes("앱")) type = "mobile";
  if (lower.includes("api")) type = "api";
  if (lower.includes("fullstack") || lower.includes("풀스택"))
    type = "fullstack";

  const features: string[] = [];
  if (/(login|로그인)/i.test(message)) features.push("authentication");
  if (/(payment|결제)/i.test(message)) features.push("payment");
  if (/(realtime|실시간)/i.test(message)) features.push("realtime");
  if (/(chat|채팅)/i.test(message)) features.push("chat");
  if (/(blog|블로그)/i.test(message)) features.push("blog");
  if (/(auction|경매)/i.test(message)) features.push("auction");

  const name = deriveProjectName(message);

  return {
    name,
    description: message.trim(),
    type,
    features: features.length > 0 ? features : ["core"],
    technology: undefined,
    complexity: "medium",
    estimatedTime: undefined,
  };
}

async function buildProjectRequestFromActionResult(
  actionResult: ActionResult,
  enhancedPrompt: EnhancedPrompt,
  userContext: UserContext,
  sessionId: string
): Promise<ProjectRequest> {
  // ActionRouter 결과를 기반으로 프로젝트 요청 생성
  const { intent, target, action, enhancedMessage } = enhancedPrompt;

  // 기본 프로젝트 요청 생성
  const baseRequest = buildProjectRequestFromMessage(enhancedMessage);

  // ActionRouter 결과를 반영한 요청 개선
  const enhancedRequest = { ...baseRequest };

  // ActionRouter 결과 메시지를 설명에 포함
  enhancedRequest.description = `${actionResult.message}\n\n의도: ${intent.description}\n요청: ${enhancedMessage}`;

  // ActionRouter 데이터를 활용한 요청 개선
  if (actionResult.data) {
    switch (actionResult.nextAction) {
      case "create_project":
        enhancedRequest.description += `\n\n새 프로젝트 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        if (actionResult.data.type) {
          enhancedRequest.type = actionResult.data.type as any;
        }
        if (actionResult.data.features) {
          enhancedRequest.features = Array.isArray(actionResult.data.features)
            ? actionResult.data.features
            : [actionResult.data.features];
        }
        break;

      case "create_page":
        enhancedRequest.description += `\n\n새 페이지 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case "create_component":
        enhancedRequest.description += `\n\n새 컴포넌트 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case "modify_page":
        enhancedRequest.description += `\n\n페이지 수정 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case "modify_component":
        enhancedRequest.description += `\n\n컴포넌트 수정 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case "fix_bug":
        enhancedRequest.description += `\n\n버그 수정 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case "implement_feature":
        enhancedRequest.description += `\n\n기능 구현 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case "review_code":
        enhancedRequest.description += `\n\n코드 리뷰 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case "answer_question":
        enhancedRequest.description += `\n\n질문 답변 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      default:
        enhancedRequest.description += `\n\n처리 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
    }
  }

  // 컨텍스트 정보 추가
  if (enhancedPrompt.context.projectContext) {
    enhancedRequest.description += `\n\n${enhancedPrompt.context.projectContext}`;
  }
  if (enhancedPrompt.context.componentContext) {
    enhancedRequest.description += `\n\n${enhancedPrompt.context.componentContext}`;
  }

  return enhancedRequest;
}

function deriveProjectName(message: string): string {
  // 메시지에서 핵심 키워드 추출
  const keywords = extractProjectKeywords(message);

  if (keywords.length > 0) {
    // 키워드 기반으로 의미있는 프로젝트명 생성
    const projectName = generateMeaningfulProjectName(keywords);
    return projectName.length > 20 ? projectName.slice(0, 20) : projectName;
  }

  // 폴백: 더 창의적인 기본 프로젝트명 생성
  const creativeNames = [
    "네오스페이스",
    "퓨처허브",
    "인노베이션존",
    "크리에이티브랩",
    "테크플로우",
    "디지털스튜디오",
    "아이디어팩토리",
    "스마트워크스",
    "클라우드네스트",
    "데이터허브",
    "코드스튜디오",
    "웹크래프트",
    "앱마스터",
    "디지털아트",
    "테크마스터",
    "매직랩",
    "크래프트존",
    "팩토리스페이스",
    "스튜디오허브",
    "플로우크래프트",
    "네오매직",
    "퓨처크래프트",
    "인노베이션매직",
    "크리에이티브매직",
    "테크크래프트",
    "디지털매직",
    "아이디어크래프트",
    "스마트매직",
    "클라우드크래프트",
    "데이터매직",
  ];

  // 현재 시간 기반으로 랜덤하게 선택 (같은 요청에 대해서는 같은 이름)
  const timestamp = Date.now();
  const randomIndex = timestamp % creativeNames.length;

  return creativeNames[randomIndex];
}

function extractProjectKeywords(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const keywords: string[] = [];

  // 프로젝트 타입 키워드
  if (lowerMessage.includes("sns") || lowerMessage.includes("소셜"))
    keywords.push("social");
  if (lowerMessage.includes("블로그")) keywords.push("blog");
  if (lowerMessage.includes("쇼핑") || lowerMessage.includes("커머스"))
    keywords.push("shop");
  if (lowerMessage.includes("퀴즈") || lowerMessage.includes("학습"))
    keywords.push("learn");
  if (lowerMessage.includes("게임")) keywords.push("game");
  if (lowerMessage.includes("채팅")) keywords.push("chat");
  if (lowerMessage.includes("결제")) keywords.push("payment");
  if (lowerMessage.includes("경매")) keywords.push("auction");

  // 기능 키워드
  if (lowerMessage.includes("로그인") || lowerMessage.includes("인증"))
    keywords.push("auth");
  if (lowerMessage.includes("프로필")) keywords.push("profile");
  if (lowerMessage.includes("게시물") || lowerMessage.includes("포스트"))
    keywords.push("post");
  if (lowerMessage.includes("댓글")) keywords.push("comment");
  if (lowerMessage.includes("피드")) keywords.push("feed");
  if (lowerMessage.includes("친구")) keywords.push("friend");
  if (lowerMessage.includes("실시간")) keywords.push("realtime");

  return keywords;
}

function generateMeaningfulProjectName(keywords: string[]): string {
  const nameMap: { [key: string]: string[] } = {
    social: [
      "소셜커넥트",
      "소셜허브",
      "커뮤니티존",
      "소셜스페이스",
      "프렌드허브",
      "소셜매직",
      "커넥트존",
      "소셜팩토리",
      "프렌드스튜디오",
      "소셜크래프트",
    ],
    blog: [
      "블로그스페이스",
      "포스트허브",
      "스토리랩",
      "컨텐츠스튜디오",
      "블로그마스터",
      "스토리팩토리",
      "포스트크래프트",
      "블로그매직",
      "스토리존",
      "컨텐츠크래프트",
    ],
    shop: [
      "스마트쇼핑",
      "커머스허브",
      "쇼핑존",
      "마켓플레이스",
      "스토어랩",
      "쇼핑매직",
      "커머스크래프트",
      "스토어팩토리",
      "쇼핑스튜디오",
      "마켓크래프트",
    ],
    learn: [
      "러닝플로우",
      "에듀허브",
      "스터디존",
      "학습스페이스",
      "지식랩",
      "러닝매직",
      "에듀크래프트",
      "스터디팩토리",
      "학습스튜디오",
      "지식크래프트",
    ],
    game: [
      "게임존",
      "플레이허브",
      "엔터테인먼트랩",
      "게임스튜디오",
      "플레이존",
      "게임매직",
      "플레이크래프트",
      "게임팩토리",
      "엔터테인먼트스튜디오",
      "플레이크래프트",
    ],
    chat: [
      "채팅허브",
      "메시지존",
      "커뮤니케이션랩",
      "채팅스페이스",
      "톡허브",
      "채팅매직",
      "메시지크래프트",
      "톡팩토리",
      "채팅스튜디오",
      "메시지크래프트",
    ],
    payment: [
      "페이플로우",
      "결제허브",
      "파이낸스존",
      "페이스튜디오",
      "머니랩",
      "페이매직",
      "결제크래프트",
      "파이낸스팩토리",
      "페이스튜디오",
      "머니크래프트",
    ],
    auction: [
      "옥션프로",
      "경매허브",
      "비딩존",
      "옥션스페이스",
      "경매랩",
      "옥션매직",
      "경매크래프트",
      "비딩팩토리",
      "옥션스튜디오",
      "경매크래프트",
    ],
    auth: [
      "인증시스템",
      "시큐리티허브",
      "로그인존",
      "인증랩",
      "시큐리티존",
      "인증매직",
      "시큐리티크래프트",
      "로그인팩토리",
      "인증스튜디오",
      "시큐리티크래프트",
    ],
    profile: [
      "프로필허브",
      "유저존",
      "프로필스페이스",
      "유저랩",
      "프로필스튜디오",
      "프로필매직",
      "유저크래프트",
      "프로필팩토리",
      "유저스튜디오",
      "프로필크래프트",
    ],
    post: [
      "포스트쉐어",
      "포스트허브",
      "컨텐츠존",
      "포스트랩",
      "쉐어스페이스",
      "포스트매직",
      "컨텐츠크래프트",
      "쉐어팩토리",
      "포스트스튜디오",
      "컨텐츠크래프트",
    ],
    comment: [
      "댓글허브",
      "코멘트존",
      "댓글랩",
      "피드백허브",
      "코멘트스튜디오",
      "댓글매직",
      "코멘트크래프트",
      "피드백팩토리",
      "댓글스튜디오",
      "코멘트크래프트",
    ],
    feed: [
      "피드플로우",
      "피드허브",
      "스트림존",
      "피드랩",
      "플로우스페이스",
      "피드매직",
      "스트림크래프트",
      "플로우팩토리",
      "피드스튜디오",
      "스트림크래프트",
    ],
    friend: [
      "친구커넥트",
      "친구허브",
      "커넥트존",
      "친구랩",
      "커넥트스튜디오",
      "친구매직",
      "커넥트크래프트",
      "친구팩토리",
      "친구스튜디오",
      "커넥트크래프트",
    ],
    realtime: [
      "실시간허브",
      "리얼타임존",
      "실시간랩",
      "라이브허브",
      "리얼타임스페이스",
      "실시간매직",
      "라이브크래프트",
      "리얼타임팩토리",
      "실시간스튜디오",
      "라이브크래프트",
    ],
  };

  // 키워드 조합으로 프로젝트명 생성
  if (keywords.length === 1) {
    const names = nameMap[keywords[0]] || [`${keywords[0]}앱`];
    const timestamp = Date.now();
    const randomIndex = timestamp % names.length;
    return names[randomIndex];
  }

  if (keywords.length >= 2) {
    // 가장 중요한 키워드 2개 조합
    const primaryNames = nameMap[keywords[0]] || [keywords[0]];
    const secondaryNames = nameMap[keywords[1]] || [keywords[1]];

    const timestamp = Date.now();
    const primaryIndex = timestamp % primaryNames.length;
    const secondaryIndex = (timestamp >> 8) % secondaryNames.length; // 다른 비트 사용

    const primary = primaryNames[primaryIndex];
    const secondary = secondaryNames[secondaryIndex];

    return `${primary}${secondary}`;
  }

  // 기본 창의적인 이름들
  const defaultNames = [
    "네오스페이스",
    "퓨처허브",
    "인노베이션존",
    "크리에이티브랩",
    "테크플로우",
    "디지털스튜디오",
    "아이디어팩토리",
    "스마트워크스",
    "클라우드네스트",
    "데이터허브",
    "코드스튜디오",
    "웹크래프트",
    "앱마스터",
    "디지털아트",
    "테크마스터",
    "매직랩",
    "크래프트존",
    "팩토리스페이스",
    "스튜디오허브",
    "플로우크래프트",
    "네오매직",
    "퓨처크래프트",
    "인노베이션매직",
    "크리에이티브매직",
    "테크크래프트",
  ];

  const timestamp = Date.now();
  const randomIndex = timestamp % defaultNames.length;
  return defaultNames[randomIndex];
}

// End of helpers

import { VirtualPreviewGeneratorAgent } from "../agents/virtualPreviewGeneratorAgent.js";

export async function handleVirtualPreview(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { pageId, "*": filePath } = request.params as {
      pageId: string;
      "*": string;
    };

    if (!pageId || !filePath) {
      reply.status(400).send({ error: "pageId and filePath are required." });
      return;
    }

    const previewAgent = new VirtualPreviewGeneratorAgent();
    const htmlContent = await previewAgent.execute({
      pageId: pageId,
      filePath: `/${filePath}`,
    });

    reply.type("text/html").send(htmlContent);
  } catch (error) {
    console.error("Error generating virtual preview:", error);
    reply.status(500).send({ error: "Failed to generate virtual preview" });
  }
}

// 프로젝트 복구 핸들러
export async function handleProjectRecovery(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectId, action } = request.body as any;

    if (action === "continue") {
      // 프로젝트 정보 조회
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });

      if (!project) {
        reply.status(404).send({ error: "Project not found" });
        return;
      }

      // 프로젝트 요구사항 분석 (requirements 컬럼 우선 사용)
      const requirements =
        project.requirements || project.description || project.name;

      // AI를 사용하여 프로젝트 완성
      console.log("프로젝트 복구 시작:", { projectId, requirements });

      const generatedContent = await generateProjectContent(requirements);
      console.log("생성된 콘텐츠:", generatedContent);

      // 생성된 내용을 데이터베이스에 저장 (트랜잭션으로 안전하게 처리)
      console.log("페이지 및 컴포넌트 저장 시작...");

      const result = await db.transaction(async (tx) => {
        // 기존 데이터 삭제
        await tx.delete(pages).where(eq(pages.projectId, projectId));
        await tx
          .delete(componentDefinitions)
          .where(eq(componentDefinitions.projectId, projectId));

        // 새 데이터 생성
        const savedPages = await saveGeneratedPagesWithTx(
          tx,
          projectId,
          generatedContent.pages
        );
        const savedComponentDefinitions = await saveGeneratedComponentsWithTx(
          tx,
          projectId,
          generatedContent.components
        );

        // pages에 components 인스턴스 배치
        const savedComponents = await savePageComponentsWithTx(
          tx,
          savedPages,
          savedComponentDefinitions
        );

        return { savedPages, savedComponents, savedComponentDefinitions };
      });

      console.log("저장된 페이지:", result.savedPages);
      console.log("저장된 컴포넌트:", result.savedComponents);

      reply.send({
        success: true,
        message: "프로젝트 복구 완료",
        generated: {
          pages: result.savedPages,
          componentDefinitions: result.savedComponentDefinitions,
          components: result.savedComponents,
        },
      });
    } else {
      reply.status(400).send({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("Error in project recovery:", error);
    reply.status(500).send({ error: "프로젝트 복구 실패" });
  }
}

// AI를 사용하여 프로젝트 콘텐츠 생성
async function generateProjectContent(requirements: string) {
  console.log("generateProjectContent 호출됨:", requirements);

  const MAX_RETRIES = 3;
  let lastError: any = null;
  let originalRequirements = requirements; // 초기 요구사항 저장

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`AI 생성 시도 ${attempt}/${MAX_RETRIES}...`);

      const prompt =
        attempt === 1
          ? `사용자 요구사항: "${originalRequirements}"

이 요구사항에 맞는 웹사이트를 생성해주세요. 다음을 포함해야 합니다:

1. 페이지 구조 (경로, 이름, 설명)
2. 컴포넌트 정의 (타입, props, 렌더링 템플릿, CSS)
3. 실제 기능이 동작하는 코드

JSON 형태로 응답해주세요. 다음과 같은 구조로:

{
  "pages": [
    {
      "path": "/",
      "name": "페이지 이름",
      "layoutJson": {
        "components": [
          { "type": "컴포넌트타입", "props": { "propName": "값" } }
        ]
      }
    }
  ],
  "components": [
    {
      "type": "컴포넌트타입",
      "displayName": "표시 이름",
      "category": "카테고리",
      "propsSchema": { "propName": { "type": "string" } },
      "renderTemplate": "<div>{{propName}}</div>",
      "cssStyles": "CSS 스타일"
    }
  ]
}`
          : requirements; // 재시도 시에는 requirements가 자체 수정 프롬프트가 됨

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const response = await model.generateContent(prompt);
      const resultText = await response.response.text();

      console.log(`AI 응답 (시도 ${attempt}):`, resultText);

      // JSON 파싱 및 검증
      const parsedResult = JSON.parse(resultText);

      // 응답 구조 검증
      if (
        parsedResult.pages &&
        Array.isArray(parsedResult.pages) &&
        parsedResult.components &&
        Array.isArray(parsedResult.components)
      ) {
        console.log("AI 생성 성공!");
        return parsedResult; // 성공 시 즉시 반환
      } else {
        throw new Error("AI 응답의 구조가 올바르지 않습니다.");
      }
    } catch (error) {
      lastError = error;
      const resultText = lastError.message; // 재시도 프롬프트에 오류 메시지 포함
      console.error(`AI 생성 실패 (시도 ${attempt}):`, error);

      if (attempt < MAX_RETRIES) {
        console.log("자체 수정을 위해 재시도합니다...");
        // 다음 시도를 위해 requirements를 자체 수정 프롬프트로 업데이트
        requirements = `이전 시도에서 실패했습니다. 오류: ${resultText}\n\n원래 요구사항: "${originalRequirements}"\n\n오류를 수정하여 올바른 JSON 구조로 다시 생성해주세요. 설명이나 다른 텍스트 없이 순수한 JSON 객체만 응답해야 합니다.`;
      }
    }
  }

  // 모든 재시도 실패 후
  console.error("최종 AI 생성 실패, 기본 템플릿 사용:", lastError);
  const projectType = determineProjectType(originalRequirements); // 원래 요구사항으로 타입 결정
  const pages = generateDefaultPages(projectType);
  const components = generateDefaultComponents(projectType);
  return { pages, components };
}

// 프로젝트 타입 결정
function determineProjectType(requirements: string): string {
  const lower = requirements.toLowerCase();
  if (
    lower.includes("인스타그램") ||
    lower.includes("instagram") ||
    lower.includes("소셜")
  )
    return "social";
  if (
    lower.includes("쇼핑") ||
    lower.includes("ecommerce") ||
    lower.includes("상점")
  )
    return "ecommerce";
  if (lower.includes("블로그") || lower.includes("blog")) return "blog";
  if (lower.includes("포트폴리오") || lower.includes("portfolio"))
    return "portfolio";
  return "general";
}

// 기본 페이지 생성
function generateDefaultPages(projectType: string) {
  const basePages = [
    {
      path: "/",
      name: "메인 페이지",
      layoutJson: {
        components: [
          {
            type: "Header",
            props: {
              title: "메인 페이지",
            },
          },
          {
            type: "Content",
            props: {
              text: "메인 페이지에 오신 것을 환영합니다!",
            },
          },
        ],
      },
    },
  ];

  switch (projectType) {
    case "social":
      basePages.push({
        path: "/profile",
        name: "프로필",
        layoutJson: {
          components: [
            { type: "header", props: { title: "프로필" } },
            { type: "profile", props: { title: "사용자" } },
          ],
        },
      });
      break;
    case "ecommerce":
      basePages.push({
        path: "/products",
        name: "상품 목록",
        layoutJson: {
          components: [
            { type: "header", props: { title: "상품" } },
            { type: "product-grid", props: { title: "상품 목록" } },
          ],
        },
      });
      break;
  }

  return basePages;
}

// 기본 컴포넌트 생성
function generateDefaultComponents(projectType: string) {
  return [
    {
      type: "Header",
      displayName: "Header",
      category: "Layout",
      propsSchema: { title: { type: "string" } },
      renderTemplate: '<header class="header"><h1>{{title}}</h1></header>',
      cssStyles:
        ".header { padding: 1rem; background: #f8f9fa; text-align: center; }",
    },
    {
      type: "Content",
      displayName: "Content",
      category: "Display",
      propsSchema: { text: { type: "string" } },
      renderTemplate: '<div class="content">{{text}}</div>',
      cssStyles:
        ".content { padding: 2rem; margin: 1rem; border: 1px solid #ddd; border-radius: 8px; }",
    },
  ];
}

// 생성된 페이지를 데이터베이스에 저장 (트랜잭션 없음 - 기존 호환성용)
async function saveGeneratedPages(projectId: string, pageData: any[]) {
  const savedPages = [];

  // 기존 페이지 데이터 삭제 (프로젝트 복구 시)
  await db.delete(pages).where(eq(pages.projectId, projectId));

  for (const page of pageData) {
    const savedPage = await db
      .insert(pages)
      .values({
        projectId,
        path: page.path,
        name: page.name,
        layoutJson: page.layoutJson,
      })
      .returning();

    savedPages.push(savedPage[0]);
  }

  return savedPages;
}

// 트랜잭션 내에서 페이지 저장 (새로 추가)
async function saveGeneratedPagesWithTx(
  tx: PostgresJsDatabase<any>,
  projectId: string,
  pageData: any[]
) {
  const savedPages = [];

  for (const page of pageData) {
    // AI가 생성한 layoutJson을 올바른 구조로 변환
    const layoutJson = {
      layout: "default",
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        createdBy: "AI Agent",
      },
      components: page.layoutJson?.components || [],
    };

    const savedPage = await tx
      .insert(pages)
      .values({
        projectId,
        path: page.path,
        name: page.name,
        layoutJson: layoutJson,
      })
      .returning();

    savedPages.push(savedPage[0]);
  }

  return savedPages;
}

// 생성된 컴포넌트를 데이터베이스에 저장 (트랜잭션 없음 - 기존 호환성용)
async function saveGeneratedComponents(
  projectId: string,
  componentData: any[]
) {
  const savedComponents = [];

  // 기존 컴포넌트 데이터 삭제 (프로젝트 복구 시)
  await db
    .delete(componentDefinitions)
    .where(eq(componentDefinitions.projectId, projectId));

  for (const component of componentData) {
    const savedComponent = await db
      .insert(componentDefinitions)
      .values({
        projectId,
        name: component.type,
        displayName: component.displayName,
        category: component.category,
        propsSchema: component.propsSchema,
        renderTemplate: component.renderTemplate,
        cssStyles: component.cssStyles,
      })
      .returning();

    savedComponents.push(savedComponent[0]);
  }

  return savedComponents;
}

// 트랜잭션 내에서 컴포넌트 저장 (새로 추가)
async function saveGeneratedComponentsWithTx(
  tx: PostgresJsDatabase<any>,
  projectId: string,
  componentData: any[]
) {
  const savedComponents = [];

  for (const component of componentData) {
    const savedComponent = await tx
      .insert(componentDefinitions)
      .values({
        projectId,
        name: component.type,
        displayName: component.displayName,
        category: component.category,
        propsSchema: component.propsSchema,
        renderTemplate: component.renderTemplate,
        cssStyles: component.cssStyles,
      })
      .returning();

    savedComponents.push(savedComponent[0]);
  }

  return savedComponents;
}

// 트랜잭션 내에서 페이지에 컴포넌트 인스턴스 배치 (새로 추가)
async function savePageComponentsWithTx(
  tx: PostgresJsDatabase<any>,
  savedPages: any[],
  savedComponentDefinitions: any[]
) {
  const savedComponents = [];

  for (const page of savedPages) {
    if (page.layoutJson && page.layoutJson.components) {
      for (let i = 0; i < page.layoutJson.components.length; i++) {
        const pageComponent = page.layoutJson.components[i];
        const componentDef = savedComponentDefinitions.find(
          (def) => def.name === pageComponent.type
        );

        if (componentDef) {
          const savedComponent = await tx
            .insert(components)
            .values({
              pageId: page.id,
              componentDefinitionId: componentDef.id,
              props: pageComponent.props || {},
              orderIndex: i,
            })
            .returning();

          savedComponents.push(savedComponent[0]);
        }
      }
    }

    // After inserting component instances for the page, sync pages.layoutJson.components
    // with the authoritative instances stored in the components table.
    // This ensures layout_json.components is populated for consumers expecting inline layout.
    const pageComponents = await tx
      .select({
        id: components.id,
        props: components.props,
        orderIndex: components.orderIndex,
        componentName: componentDefinitions.name,
      })
      .from(components)
      .innerJoin(
        componentDefinitions,
        eq(components.componentDefinitionId, componentDefinitions.id)
      )
      .where(eq(components.pageId, page.id))
      .orderBy(components.orderIndex);

    const layoutComponents = pageComponents.map((comp) => ({
      type: comp.componentName,
      props: comp.props,
    }));

    const nextLayoutJson = {
      ...(page.layoutJson || {}),
      components: layoutComponents,
    };

    await tx
      .update(pages)
      .set({ layoutJson: nextLayoutJson })
      .where(eq(pages.id, page.id));
  }

  return savedComponents;
}

// 프로젝트 구조 가져오기
export async function getProjectStructure(projectId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const projectPages = await db.query.pages.findMany({
    where: eq(pages.projectId, projectId),
  });

  const projectComponentDefinitions =
    await db.query.componentDefinitions.findMany({
      where: eq(componentDefinitions.projectId, projectId),
    });

  // components는 pageId를 통해 간접적으로 가져와야 함
  const projectComponents = await db.query.components.findMany({
    where: inArray(
      components.pageId,
      projectPages.map((p) => p.id)
    ),
  });

  return {
    project,
    pages: projectPages,
    componentDefinitions: projectComponentDefinitions,
    components: projectComponents,
  };
}

// 프로젝트를 HTML로 렌더링
export async function renderProjectToHTML(projectData: any) {
  const { project, pages, components } = projectData;

  // 기본 HTML 템플릿
  let html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .header { background: #f8f9fa; padding: 1rem; text-align: center; }
        .content { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .footer { background: #333; color: white; padding: 1rem; text-align: center; }
        .component { margin: 1rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
`;

  // 각 페이지 렌더링
  for (const page of pages) {
    html += `<div class="page" data-path="${page.path}">`;
    html += `<h1>${page.name}</h1>`;

    if (page.layoutJson && page.layoutJson.components) {
      for (const comp of page.layoutJson.components) {
        const componentDef = components.find((c: any) => c.name === comp.type);
        if (componentDef) {
          html += `<div class="component ${comp.type}">`;
          // 컴포넌트 렌더링
          let componentHtml = componentDef.renderTemplate;
          if (comp.props) {
            for (const [key, value] of Object.entries(comp.props)) {
              componentHtml = componentHtml.replace(
                `{{${key}}}`,
                String(value)
              );
            }
          }
          html += componentHtml;
          html += `</div>`;
        }
      }
    }

    html += `</div>`;
  }

  html += `
</body>
</html>`;

  return html;
}

// 메시지 템플릿 함수들
function generateAgentSuccessMessage(
  agentName: string,
  action: string
): string {
  const messages = {
    "Project Architect Agent": `${action} 아키텍처 설계를 완료했습니다.`,
    "UI/UX Designer Agent": `${action} UI/UX 인터페이스 설계를 완료했습니다.`,
    "Code Generator Agent": `${action} 코드 구조 생성을 완료했습니다.`,
    "Development Guide Agent": `${action} 개발 가이드를 작성했습니다.`,
    "Database Manager Agent": `${action} 데이터베이스 설계를 완료했습니다.`,
  };

  return (
    messages[agentName as keyof typeof messages] ||
    `${action} 작업을 완료했습니다.`
  );
}

function generateSummaryMessage(
  agentCount: number,
  successCount: number
): string {
  if (successCount === agentCount) {
    return `모든 에이전트(${agentCount}개)가 성공적으로 작업을 완료했습니다.`;
  } else if (successCount > 0) {
    return `${successCount}/${agentCount} 에이전트가 성공적으로 작업을 완료했습니다.`;
  } else {
    return "에이전트 작업 중 문제가 발생했습니다.";
  }
}

function generateErrorMessage(agentName: string, error?: any): string {
  const baseMessages = {
    "Master Developer": "Master Developer 처리 중 오류가 발생했습니다.",
    "Project Architect Agent": "아키텍처 설계 중 오류가 발생했습니다.",
    "UI/UX Designer Agent": "UI/UX 설계 중 오류가 발생했습니다.",
    "Code Generator Agent": "코드 생성 중 오류가 발생했습니다.",
    "Development Guide Agent": "개발 가이드 작성 중 오류가 발생했습니다.",
    "Database Manager Agent": "데이터베이스 설계 중 오류가 발생했습니다.",
  };

  const baseMessage =
    baseMessages[agentName as keyof typeof baseMessages] ||
    "처리 중 오류가 발생했습니다.";

  if (error?.message) {
    return `${baseMessage} (${error.message})`;
  }

  return baseMessage;
}
