/**
 * @file The core service for the workflow engine.
 */
import { eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FastifyInstance } from "fastify";

import { db } from "@/db/db.instance";
import { usersToOrganizations } from "@/drizzle/schema";
import { toolRegistry, workflowExecutor } from "./index";
import { Plan } from "./types";
import { refineJsonResponse } from "./utils/jsonRefiner";
import { ProjectType, getAvailableTools } from "./toolCategories";

// Define the structure of the context object coming from the frontend
interface MessageContext {
  activeView?: "editor" | "preview";
  activeFile?: string | null;
  activePreviewRoute?: string | null;
}

export class WorkflowService {
  private app: FastifyInstance;
  private model: any;

  constructor(app: FastifyInstance) {
    this.app = app;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async preparePlan(
    prompt: string,
    user: { id: string },
    chatHistory: any[],
    projectId?: string,
    context?: MessageContext
  ): Promise<Plan> {
    this.app.log.info(
      `[WorkflowService] Preparing plan for prompt: "${prompt}" for project ${projectId}.`
    );
    const plan = await this.generatePlan(
      prompt,
      user,
      chatHistory,
      projectId,
      context
    );
    this.app.log.info({ plan }, "[WorkflowService] Generated Plan");

    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error("AI Planner returned an invalid plan.");
    }
    return plan;
  }

  async executePlan(
    plan: Plan,
    user: { id: string },
    projectId?: string
  ): Promise<any> {
    this.app.log.info(
      `[WorkflowService] Executing plan: "${plan.name}" for project ${projectId}.`
    );

    const enhancedPlan = this.enhancePlanWithContext(plan, user, projectId);

    const outputs = await workflowExecutor.execute(
      this.app,
      enhancedPlan,
      {},
      { projectId, userId: user.id }
    );
    this.app.log.info(
      { outputs: Object.fromEntries(outputs) },
      "[WorkflowService] Workflow executed successfully"
    );

    return { plan, outputs: Object.fromEntries(outputs) };
  }

  private determineProjectType(projectId?: string): ProjectType {
    return ProjectType.VFS;
  }

  private enhancePlanWithContext(
    plan: Plan,
    user: { id: string },
    projectId?: string
  ): Plan {
    return plan;
  }

  private async generatePlan(
    prompt: string,
    user: { id: string },
    chatHistory: any[],
    projectId?: string,
    context: MessageContext = {}
  ): Promise<Plan> {
    const projectType = this.determineProjectType(projectId);
    const appropriateTools = getAvailableTools(projectType);
    const availableTools = appropriateTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: toolRegistry.get(tool.name)?.inputSchema || {},
    }));

    const memberships = await db
      .select({ organizationId: usersToOrganizations.organizationId })
      .from(usersToOrganizations)
      .where(eq(usersToOrganizations.userId, user.id))
      .limit(1);
    const organizationId = memberships[0]?.organizationId;

    if (!organizationId) {
      throw new Error(`User ${user.id} has no organization.`);
    }

    const formattedHistory = chatHistory.map((item: any) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.message || "" }],
    }));

    const plannerPrompt = `
    You are an expert AI Project Planner with advanced DAG (Directed Acyclic Graph) optimization capabilities. Your job is to analyze a user's request and create an optimal execution plan using ONLY the available tools.

    **CONTEXT:**
    - User ID: ${user.id}
    - Organization ID: ${organizationId}
    - Current Project ID: ${projectId || "N/A"}
    - User's Active View: "${context.activeView || "unknown"}"
    - Active File in Editor: "${context.activeFile || "none"}"
    - Active Route in Preview: "${context.activePreviewRoute || "none"}"

    **Available Tools:**
    ${JSON.stringify(availableTools, null, 2)}

    **ADVANCED PLANNING STRATEGY:**

    1. **DAG Optimization Principles:**
       - Identify independent tasks that can run in parallel
       - Minimize critical path length for faster execution
       - Group related operations to reduce context switching
       - Use conditional steps for dynamic behavior

    2. **Smart Decomposition:**
       - Break complex requests into atomic, reusable steps
       - Create intermediate steps for data transformation
       - Use validation steps to ensure data integrity
       - Implement rollback points for error recovery

    3. **Dependency Management:**
       - Use explicit dependencies: ["step_id"] for sequential execution
       - Use conditional dependencies: ["step_id:success"] for error handling
       - Create parallel branches for independent operations
       - Use data flow: \`\${steps.step_id.outputs.key}\` for dynamic inputs

    4. **Error Handling Strategy:**
       - Add validation steps after critical operations
       - Create fallback steps for common failure scenarios
       - Use conditional execution based on previous step results
       - Implement cleanup steps for resource management

    **PLAN STRUCTURE:**
    {
      "name": "Descriptive plan name",
      "description": "Detailed plan description",
      "estimatedDuration": "estimated execution time",
      "parallelizable": true/false,
      "steps": [
        {
          "id": "unique_step_id",
          "title": "User-friendly title",
          "description": "Detailed description",
          "tool": "tool_name",
          "inputs": { /* tool inputs */ },
          "dependencies": ["step_id1", "step_id2"],
          "conditional": "optional condition for execution",
          "retryPolicy": { "maxRetries": 3, "backoff": "exponential" },
          "rollbackAction": "optional rollback step id"
        }
      ]
    }

    **EXAMPLE: Complex Project Creation with Parallel Execution**
    {
      "name": "Create Full-Stack E-commerce Project",
      "description": "Creates a complete e-commerce application with frontend, backend, and database",
      "estimatedDuration": "2-3 minutes",
      "parallelizable": true,
      "steps": [
        {
          "id": "init_project",
          "title": "프로젝트 초기화",
          "description": "데이터베이스에 새 프로젝트 레코드 생성",
          "tool": "create_project_in_db",
          "inputs": { "name": "E-commerce App", "type": "fullstack" },
          "dependencies": []
        },
        {
          "id": "design_architecture",
          "title": "아키텍처 설계",
          "description": "프로젝트 구조 및 기술 스택 설계",
          "tool": "create_project_architecture",
          "inputs": { "projectId": "\${steps.init_project.outputs.projectId}" },
          "dependencies": ["init_project"]
        },
        {
          "id": "create_backend_files",
          "title": "백엔드 파일 생성",
          "description": "API 서버 및 데이터베이스 스키마 생성",
          "tool": "compile_blueprint_to_vfs",
          "inputs": { "blueprint": "\${steps.design_architecture.outputs.blueprint}" },
          "dependencies": ["design_architecture"]
        },
        {
          "id": "create_frontend_files",
          "title": "프론트엔드 파일 생성",
          "description": "React 컴포넌트 및 페이지 생성",
          "tool": "create_vfs_file",
          "inputs": { "path": "/src/components/ProductList.tsx", "content": "..." },
          "dependencies": ["design_architecture"]
        },
        {
          "id": "validate_build",
          "title": "빌드 검증",
          "description": "생성된 프로젝트의 빌드 가능성 검증",
          "tool": "run_shell_command",
          "inputs": { "command": "npm run build", "cwd": "/project" },
          "dependencies": ["create_backend_files", "create_frontend_files"],
          "retryPolicy": { "maxRetries": 2, "backoff": "linear" }
        }
      ]
    }

    **CRITICAL REQUIREMENTS:**
    - Always optimize for parallel execution where possible
    - Include proper error handling and retry mechanisms
    - Use descriptive step IDs and titles
    - Validate all tool inputs and dependencies
    - Consider rollback scenarios for critical operations

    Respond with ONLY the raw JSON object, without any markdown formatting.
    `;

    const chat = this.model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(
      `Latest User Request: "${prompt}"\n\n${plannerPrompt}`
    );

    const rawText: string = result?.response?.text?.() ?? "";
    let parsedPlan: Plan;
    try {
      const refined = await refineJsonResponse<Plan>(rawText);
      parsedPlan = typeof refined === "string" ? JSON.parse(refined) : refined;
    } catch (error) {
      this.app.log.error(
        { error, rawText },
        "[WorkflowService] Failed to parse Plan JSON"
      );
      throw new Error("Failed to parse Plan JSON from AI response.");
    }

    return parsedPlan;
  }
}
