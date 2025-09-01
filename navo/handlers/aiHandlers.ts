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
import { and, desc, eq, sql } from "drizzle-orm";
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

import createDOMPurify from "dompurify";

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
      userId,
      type: "ai_command",
      data: { command, response: text },
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
        ownerId: userId as string,
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

    // 세션 ID 생성 또는 기존 세션 사용
    const sessionId = context?.sessionId || `session_${Date.now()}_${userId}`;

    // ContextManager를 사용하여 사용자 컨텍스트 조회
    let userContext: UserContext;
    try {
      userContext = await contextManager.getContext(sessionId, userId);
    } catch (error) {
      console.error("Error getting user context:", error);
      // 컨텍스트 조회 실패 시 기본 컨텍스트 사용
      userContext = {
        sessionId,
        userId,
        status: "active",
        version: 1,
        contextData: {},
        lastActivity: new Date(),
      };
    }

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
  const words = message
    .replace(/[\n\r]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 4)
    .map((w) => w.replace(/[^\p{L}\p{N}_-]/gu, ""));
  const base = words.join("-") || "my-project";
  return base.length > 48 ? base.slice(0, 48) : base;
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

  try {
    // Gemini AI를 사용하여 실제 요구사항에 맞는 프로젝트 생성
    const prompt = `사용자 요구사항: "${requirements}"

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
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const response = await model.generateContent(prompt);
    const result = await response.response.text();

    console.log("AI 응답:", result);

    // JSON 파싱 및 검증
    const parsedResult = JSON.parse(result);

    // 기본값으로 fallback
    if (!parsedResult.pages || !parsedResult.components) {
      console.log("AI 응답이 올바르지 않아 기본 템플릿 사용");
      const projectType = determineProjectType(requirements);
      const pages = generateDefaultPages(projectType);
      const components = generateDefaultComponents(projectType);
      return { pages, components };
    }

    return parsedResult;
  } catch (error) {
    console.error("AI 생성 실패, 기본 템플릿 사용:", error);

    // AI 실패 시 기본 템플릿 사용
    const projectType = determineProjectType(requirements);
    const pages = generateDefaultPages(projectType);
    const components = generateDefaultComponents(projectType);

    return { pages, components };
  }
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
          { type: "header", props: { title: "메인 페이지" } },
          { type: "content", props: { text: "환영합니다!" } },
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
      type: "header",
      displayName: "헤더",
      category: "layout",
      propsSchema: { title: { type: "string" } },
      renderTemplate: "<header><h1>{{title}}</h1></header>",
      cssStyles: "header { padding: 1rem; background: #f8f9fa; }",
    },
    {
      type: "content",
      displayName: "콘텐츠",
      category: "content",
      propsSchema: { text: { type: "string" } },
      renderTemplate: "<div class='content'>{{text}}</div>",
      cssStyles: ".content { padding: 2rem; }",
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
  tx: any,
  projectId: string,
  pageData: any[]
) {
  const savedPages = [];

  for (const page of pageData) {
    const savedPage = await tx
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
  tx: any,
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
  tx: any,
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
              order: i,
            })
            .returning();

          savedComponents.push(savedComponent[0]);
        }
      }
    }
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

  const projectComponents = await db.query.componentDefinitions.findMany({
    where: eq(componentDefinitions.projectId, projectId),
  });

  return {
    project,
    pages: projectPages,
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
        const componentDef = components.find((c) => c.name === comp.type);
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
