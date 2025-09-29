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
import { PromptLoader } from "@/lib/promptLoader";

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
    const modelName = 'gemini-2.5-flash';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.model = genAI.getGenerativeModel({ model: modelName });
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

  async createAndRunWorkflow(params: {
    projectId: string;
    userId: string;
    prompt: string;
    chatHistory: any[];
    context: MessageContext;
  }) {
    const { projectId, userId, prompt, chatHistory, context } = params;
    const user = { id: userId };

    // 1. Generate the plan based on the prompt and context
    const plan = await this.preparePlan(
      prompt,
      user,
      chatHistory,
      projectId,
      context
    );

    // 2. Execute the plan in the background (don't await)
    this.executePlan(plan, user, projectId).catch((error) => {
      this.app.log.error(
        error,
        `[WorkflowService] Background execution failed for plan "${plan.name}"`
      );
      // Here you might want to add error handling, like notifying the user via SSE
    });

    // 3. Return a run identifier immediately
    // For now, a simple object. Later, this could be a record from a workflow_runs table.
    return {
      id: `run_${new Date().getTime()}`,
      planName: plan.name,
      status: "started",
    };
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

    const plannerPrompt = PromptLoader.render('workflow-planner.prompt.txt', {
      userId: user.id,
      organizationId,
      projectId: projectId || "N/A",
      activeView: context.activeView || "unknown",
      activeFile: context.activeFile || "none",
      activePreviewRoute: context.activePreviewRoute || "none",
      availableTools: JSON.stringify(availableTools, null, 2)
    });

    const chat = this.model.startChat({
      history: formattedHistory,
    });

    const fullPrompt = `Latest User Request: "${prompt}"

${plannerPrompt}`;
    const result = await chat.sendMessage(fullPrompt);

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
