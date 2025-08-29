import { FastifyRequest, FastifyReply } from "fastify";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db/db.js";
import {
  events,
  suggestions,
  projects,
  componentDefinitions,
  pages,
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

export async function generateAndStoreDummySuggestion(
  projectId: string
): Promise<void> {
  console.log("[AI] Entering generateAndStoreDummySuggestion");
  try {
    // Fetch the current layout from the pages API to pass to the AI
    console.log("[AI] Fetching current layout from /api/pages");
    const pagesRes = await fetch(
      `http://localhost:${process.env.PORT}/api/pages`
    );
    const pagesData = await pagesRes.json();
    const currentLayout = pagesData?.pages?.[0]?.layoutJson;

    if (!currentLayout) {
      console.error("[AI] Could not fetch current layout for AI suggestion.");
      return;
    }
    console.log("[AI] Successfully fetched current layout.");

    console.log("[AI] Generating AI suggestion...");
    const aiSuggestion = await generateAiSuggestion(currentLayout);
    console.log("[AI] AI suggestion generated:", aiSuggestion);

    try {
      await db.insert(suggestions).values({
        projectId,
        type: aiSuggestion.type,
        content: aiSuggestion.content,
      });
      console.log("[AI] AI-generated suggestion stored successfully.");
    } catch (err) {
      console.error("[AI] Error storing AI-generated suggestion:", err);
    }
  } catch (err: any) {
    console.error("[AI] Error in generateAndStoreDummySuggestion:", err);
  }
  console.log("[AI] Exiting generateAndStoreDummySuggestion");
}

export async function handleGetSuggestions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectId, type, limit = 10, offset = 0 } = request.query as any;

    const rows = await db
      .select()
      .from(suggestions)
      .where(
        sql`${
          projectId ? eq(suggestions.projectId, projectId as string) : sql`true`
        } AND ${type ? eq(suggestions.type, type as string) : sql`true`}`
      )
      .limit(Number(limit))
      .offset(Number(offset))
      .orderBy(desc(suggestions.createdAt));

    reply.send({ suggestions: rows });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    reply.status(500).send({ error: "Failed to fetch suggestions" });
  }
}

export async function handleGenerateDummySuggestion(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: "Unauthorized" });
      return;
    }

    // Use latest project owned by user as target for dummy suggestion if available
    const latestProject = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.createdAt))
      .limit(1);

    const projectId = latestProject[0]?.id || "dummy-project-id";
    await generateAndStoreDummySuggestion(projectId);
    reply.send({ ok: true, message: "Dummy suggestion generated" });
  } catch (error) {
    console.error("Error generating dummy suggestion:", error);
    reply.status(500).send({ error: "Failed to generate dummy suggestion" });
  }
}

export async function handleTestDbSuggestions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(suggestions)
      .limit(5)
      .orderBy(desc(suggestions.createdAt));

    reply.send({ suggestions: rows });
  } catch (error) {
    console.error("Error fetching test suggestions:", error);
    reply.status(500).send({ error: "Failed to fetch test suggestions" });
  }
}

export async function handleApplySuggestion(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { suggestionId } = request.body as any;

    const updated = await db
      .update(suggestions)
      .set({ appliedAt: new Date() })
      .where(eq(suggestions.id, suggestionId))
      .returning();

    reply.send({ suggestion: updated[0] });
  } catch (error) {
    console.error("Error applying suggestion:", error);
    reply.status(500).send({ error: "Failed to apply suggestion" });
  }
}

export async function handleSeedDummyData(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: "Unauthorized" });
      return;
    }

    // Create a test project
    const created = await db
      .insert(projects)
      .values({
        name: "Test Project",
        ownerId: userId as string,
      })
      .returning();

    const project = created[0];

    // Create some test suggestions
    await db.insert(suggestions).values([
      {
        projectId: project.id,
        type: "layout",
        content: { suggestion: "Add more spacing between elements" },
      },
      {
        projectId: project.id,
        type: "style",
        content: { suggestion: "Use a more vibrant color scheme" },
      },
    ]);

    reply.send({ message: "Dummy data seeded successfully", project });
  } catch (error) {
    console.error("Error seeding dummy data:", error);
    reply.status(500).send({ error: "Failed to seed dummy data" });
  }
}

export async function handleGenerateProject(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectName } = request.body as any;
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: "Unauthorized" });
      return;
    }
    if (!projectName) {
      reply.status(400).send({ error: "Project name is required." });
      return;
    }
    const created = await db
      .insert(projects)
      .values({ name: projectName as string, ownerId: userId as string })
      .returning();
    reply.send({
      ok: true,
      message: "Project created.",
      projectId: created[0].id,
      generatedStructure: null,
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

    // Convert chat message to a coarse ProjectRequest
    const req: ProjectRequest = buildProjectRequestFromMessage(message);

    const agent = new MasterDeveloperAgent();
    const start = Date.now();

    // context에 userId 추가
    const enhancedContext = {
      ...context,
      userId: userId,
    };

    const plan = await agent.execute(req, enhancedContext);
    const totalExecutionTime = Date.now() - start;

    const agents = [
      {
        success: true,
        message: "프로젝트 요구사항 분석 및 아키텍처 설계를 완료했습니다.",
        agentName: "Project Architect Agent",
        status: "completed" as const,
        data: plan.architecture,
      },
      {
        success: true,
        message: "UI/UX 인터페이스 설계를 완료했습니다.",
        agentName: "UI/UX Designer Agent",
        status: "completed" as const,
        data: plan.uiDesign,
      },
      {
        success: true,
        message: "프로젝트 코드 구조 생성을 완료했습니다.",
        agentName: "Code Generator Agent",
        status: "completed" as const,
        data: plan.codeStructure,
      },
      {
        success: true,
        message: "개발 가이드 작성을 완료했습니다.",
        agentName: "Development Guide Agent",
        status: "completed" as const,
        data: plan.developmentGuide,
      },
    ];

    reply.send({
      success: true,
      agents,
      totalExecutionTime,
      summary: "Master Developer 프로세스가 성공적으로 완료되었습니다.",
    });
  } catch (error) {
    console.error("Error handling multi-agent chat:", error);
    reply.status(500).send({
      success: false,
      agents: [
        {
          success: false,
          message: "처리 중 오류가 발생했습니다.",
          agentName: "Master Developer",
          status: "error",
        },
      ],
      totalExecutionTime: 0,
      summary: "프로세스 처리 실패",
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

      // 프로젝트 요구사항 분석 (requirements 컬럼이 없을 수 있음)
      const requirements = project.description || project.name;

      // AI를 사용하여 프로젝트 완성
      console.log("프로젝트 복구 시작:", { projectId, requirements });

      const generatedContent = await generateProjectContent(requirements);
      console.log("생성된 콘텐츠:", generatedContent);

      // 생성된 내용을 데이터베이스에 저장
      console.log("페이지 저장 시작...");
      const savedPages = await saveGeneratedPages(
        projectId,
        generatedContent.pages
      );
      console.log("저장된 페이지:", savedPages);

      console.log("컴포넌트 저장 시작...");
      const savedComponents = await saveGeneratedComponents(
        projectId,
        generatedContent.components
      );
      console.log("저장된 컴포넌트:", savedComponents);

      reply.send({
        success: true,
        message: "프로젝트 복구 완료",
        generated: {
          pages: savedPages,
          components: savedComponents,
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

  // 실제 AI 생성 로직 (현재는 기본 템플릿 반환)
  const projectType = determineProjectType(requirements);
  console.log("프로젝트 타입 결정:", projectType);

  const pages = generateDefaultPages(projectType);
  const components = generateDefaultComponents(projectType);

  console.log("생성된 페이지:", pages);
  console.log("생성된 컴포넌트:", components);

  return {
    pages,
    components,
  };
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
            { type: "profile", props: { name: "사용자" } },
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
            { type: "product-grid", props: { items: [] } },
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

// 생성된 페이지를 데이터베이스에 저장
async function saveGeneratedPages(projectId: string, pageData: any[]) {
  const savedPages = [];

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

// 생성된 컴포넌트를 데이터베이스에 저장
async function saveGeneratedComponents(
  projectId: string,
  componentData: any[]
) {
  const savedComponents = [];

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
