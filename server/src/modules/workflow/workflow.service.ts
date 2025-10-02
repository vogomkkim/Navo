/**
 * @file The core service for the workflow engine.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FastifyInstance } from "fastify";

import { db } from "@/db/db.instance";
import { usersToOrganizations } from "@/drizzle/schema";
import { toolRegistry, workflowExecutor } from "./index";
import { Plan, PlannerOutput, WorkflowResponse, PlanStep } from "./types";
import { refineJsonResponse } from "./utils/jsonRefiner";
import { ProjectType, getAvailableTools } from "./toolCategories";
import { connectionManager, sseTicketManager } from "./workflow.controller";
import { IntentClassifier } from "./intentClassifier";
import { DynamicPromptService } from "./dynamicPrompt";
import { messageQueue } from "./messageQueue";
import { proposalStore } from "./proposalStore/inMemoryStore";

// Zod schema for validating the AI Planner's output, as per design doc.
const PlanStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tool: z.string(),
  inputs: z.record(z.any()),
  dependencies: z.array(z.string()).optional(),
  conditional: z.string().optional(),
  retryPolicy: z.any().optional(),
  rollbackAction: z.string().optional(),
  estimatedDuration: z.number().optional(),
  priority: z.number().optional(),
});

const PlanSchema = z.object({
  name: z.string(),
  description: z.string(),
  steps: z.array(PlanStepSchema),
  estimatedDuration: z.number().optional(),
  parallelizable: z.boolean().optional(),
  metadata: z.any().optional(),
});

const PlannerOutputSchema = z.object({
  decision: z.enum(['execute', 'propose']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  plan: PlanSchema,
});

// Define the structure of the context object coming from the frontend
interface MessageContext {
  activeView?: "editor" | "preview";
  activeFile?: string | null;
  activePreviewRoute?: string | null;
}

export class WorkflowService {
  private app: FastifyInstance;
  private model: any;
  private intentClassifier: IntentClassifier;
  private dynamicPromptService: DynamicPromptService;

  constructor(app: FastifyInstance) {
    this.app = app;
    const modelName = 'gemini-2.5-flash';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json"} });
    this.intentClassifier = new IntentClassifier();
    this.dynamicPromptService = new DynamicPromptService();
  }

  async executePlan(
    plan: Plan,
    user: { id: string },
    projectId?: string
  ): Promise<{ runId: string; outputs: any }> {
    const runId = `run_${Date.now()}`;
    this.app.log.info(
      `[WorkflowService] Executing plan: "${plan.name}" for project ${projectId} with runId ${runId}.`
    );

    const enhancedPlan = this.enhancePlanWithContext(plan, user, projectId);

    // Execute in the background, but don't await the full completion here
    workflowExecutor.execute(
      this.app,
      enhancedPlan,
      {},
      { projectId, userId: user.id, runId }
    ).catch(error => {
        this.app.log.error(error, `[WorkflowService] Background execution failed for runId ${runId}`);
        if (projectId) {
            connectionManager.broadcast(projectId, {
                type: "workflow_failed",
                payload: { planName: plan.name, runId, error: error.message },
            });
        }
    });

    return { runId, outputs: {} }; // Immediately return runId
  }

  async createAndRunWorkflow(params: {
    projectId: string;
    userId: string;
    prompt: string;
    chatHistory: any[];
    context: MessageContext;
  }): Promise<WorkflowResponse> {
    const { projectId, userId, prompt, chatHistory, context } = params;
    const user = { id: userId };

    // TODO: Re-integrate intent classification if needed. For now, assume all are workflow requests.

    try {
      const plannerOutput = await this.generatePlannerOutput(prompt, user, chatHistory, projectId, context);

      const validationResult = PlannerOutputSchema.safeParse(plannerOutput);

      if (!validationResult.success) {
        this.app.log.error({ error: validationResult.error, data: plannerOutput }, "AI output validation failed");
        // Create a safe recovery plan
        const recoveryPlan: Plan = {
            name: "Recovery Plan",
            description: "The AI's response was malformed. This is a safe plan to acknowledge the error.",
            steps: [{ id: 'error_step', title: 'Acknowledge Error', description: 'Log the malformed AI output', tool: 'log_message', inputs: { message: "AI output validation failed." } }]
        };
        const proposalId = await proposalStore.save({
            projectId,
            userId,
            plan: recoveryPlan,
            reasoning: 'An internal error occurred while planning. Please review the proposed recovery plan.',
            confidence: 0.0,
        });
        return {
            type: 'PROPOSAL_REQUIRED',
            proposalId,
            reasoning: 'An internal error occurred while planning. Please review the proposed recovery plan.',
            confidence: 0.0,
            planSummary: {
                name: recoveryPlan.name,
                description: recoveryPlan.description,
                steps: recoveryPlan.steps.map(s => ({ id: s.id, title: s.title, description: s.description, tool: s.tool })),
                estimatedDuration: 0,
            }
        };
      }

      const output = validationResult.data;

      if (output.decision === 'propose') {
        const proposalId = await proposalStore.save({
          projectId,
          userId,
          plan: output.plan,
          reasoning: output.reasoning,
          confidence: output.confidence,
        });
        return {
          type: 'PROPOSAL_REQUIRED',
          proposalId,
          reasoning: output.reasoning,
          confidence: output.confidence,
          planSummary: {
            name: output.plan.name,
            description: output.plan.description,
            steps: output.plan.steps.map(s => ({ id: s.id, title: s.title, description: s.description, tool: s.tool })),
            estimatedDuration: output.plan.estimatedDuration || 0,
          }
        };
      } else { // decision === 'execute'
        const { runId } = await this.executePlan(output.plan, user, projectId);
        const ticket = sseTicketManager.issue(userId);
        const sseUrl = `/api/sse/projects/${projectId}?ticket=${ticket}`;

        return {
          type: 'EXECUTION_STARTED',
          runId,
          sseUrl,
          planSummary: {
            name: output.plan.name,
            description: output.plan.description,
            steps: output.plan.steps.map(s => ({ id: s.id, title: s.title, description: s.description, tool: s.tool })),
            estimatedDuration: output.plan.estimatedDuration || 0,
          }
        };
      }
    } catch (error: any) {
      this.app.log.error(error, `[WorkflowService] Failed to create workflow`);
      throw error;
    }
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

  private async generatePlannerOutput(
    prompt: string,
    user: { id: string },
    chatHistory: any[],
    projectId?: string,
    context: MessageContext = {}
  ): Promise<PlannerOutput> {
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

    const plannerPrompt = await this.dynamicPromptService.generateWorkflowPrompt(
      user.id,
      projectId || "N/A",
      prompt,
      context,
      JSON.stringify(availableTools, null, 2)
    );

    const chat = this.model.startChat({
      history: formattedHistory,
    });

    const fullPrompt = `Latest User Request: "${prompt}"

${plannerPrompt}`;
    const result = await chat.sendMessage(fullPrompt);

    const rawText: string = result?.response?.text?.() ?? "";
    let parsedOutput: PlannerOutput;
    try {
      // The Gemini model is configured to return JSON, so we can parse it directly.
      parsedOutput = JSON.parse(rawText);
    } catch (error) {
      this.app.log.error(
        { error, rawText },
        "[WorkflowService] Failed to parse PlannerOutput JSON"
      );
      throw new Error("Failed to parse PlannerOutput JSON from AI response.");
    }

    return parsedOutput;
  }
}
