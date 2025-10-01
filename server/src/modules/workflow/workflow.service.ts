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
import { connectionManager } from "./workflow.controller";
import { IntentClassifier, IntentType } from "./intentClassifier";
import { ConversationMemoryService } from "./conversationMemory";
import { DynamicPromptService } from "./dynamicPrompt";
import { messageQueue } from "./messageQueue";

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
  private memoryService: ConversationMemoryService;
  private dynamicPromptService: DynamicPromptService;

  constructor(app: FastifyInstance) {
    this.app = app;
    const modelName = 'gemini-2.5-flash';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.model = genAI.getGenerativeModel({ model: modelName });
    this.intentClassifier = new IntentClassifier();
    this.memoryService = new ConversationMemoryService();
    this.dynamicPromptService = new DynamicPromptService();
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
    projectId?: string,
    runId?: string
  ): Promise<any> {
    this.app.log.info(
      `[WorkflowService] Executing plan: "${plan.name}" for project ${projectId} with runId ${runId}.`
    );

    const enhancedPlan = this.enhancePlanWithContext(plan, user, projectId);

    const outputs = await workflowExecutor.execute(
      this.app,
      enhancedPlan,
      {},
      { projectId, userId: user.id, runId }
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

    // 1. Classify user intent
    const intent = await this.intentClassifier.classifyIntent(prompt, context);
    this.app.log.info(`[WorkflowService] Intent classified as: ${intent.type} (confidence: ${intent.confidence})`);

    // 2. Handle based on intent
    if (intent.type === 'QUESTION') {
      return await this.handleQuestion(prompt, user, projectId, context);
    }

    // 3. For REQUEST/COMMAND/UNKNOWN, proceed with workflow
    const runId = `run_${new Date().getTime()}`;

    try {
      // Generate the plan based on the prompt and context
      const plan = await this.preparePlan(
        prompt,
        user,
        chatHistory,
        projectId,
        context
      );

      // Execute the plan in the background (don't await)
      this.executePlan(plan, user, projectId, runId)
        .then((result) => {
          // Store successful workflow in memory queue (비동기)
          messageQueue.enqueue({
            userId: user.id,
            projectId,
            userMessage: prompt,
            aiResponse: `워크플로우 "${plan.name}"가 성공적으로 완료되었습니다.`,
            context,
            metadata: {
              intent: 'workflow_request',
              success: true,
              userSatisfaction: 'positive'
            }
          });
        })
        .catch((error) => {
          this.app.log.error(
            error,
            `[WorkflowService] Background execution failed for plan "${plan.name}"`
          );

          // Store failed workflow in memory queue (비동기)
          messageQueue.enqueue({
            userId: user.id,
            projectId,
            userMessage: prompt,
            aiResponse: `워크플로우 실행 중 문제가 발생했습니다: ${error.message}`,
            context,
            metadata: {
              intent: 'workflow_request',
              success: false,
              userSatisfaction: 'negative'
            }
          });

          // Send failure event via SSE
          if (projectId) {
            connectionManager.broadcast(projectId, {
              type: "workflow_failed",
              payload: {
                planName: plan.name,
                runId,
                error: error.message,
                timestamp: new Date().toISOString()
              },
            });
          }
        });

      // Return a run identifier immediately
      return {
        id: runId,
        planName: plan.name,
        status: "started",
      };
    } catch (error) {
      this.app.log.error(
        error,
        `[WorkflowService] Failed to create workflow for plan`
      );

      // Send immediate failure event for plan generation errors
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: "workflow_failed",
          payload: {
            planName: "Unknown",
            runId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          },
        });
      }

      throw error;
    }
  }

  /**
   * Handle user questions by providing contextual information
   */
  private async handleQuestion(
    prompt: string,
    user: { id: string },
    projectId: string,
    context: MessageContext
  ): Promise<{ id: string; answer: string; status: string }> {
    try {
      // Generate dynamic prompt based on user history and patterns
      const questionPrompt = await this.dynamicPromptService.generateQuestionPrompt(
        user.id,
        projectId,
        prompt,
        context
      );

      const result = await this.model.generateContent(questionPrompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response - try to extract JSON from text
      let answerData;
      try {
        // Try to find JSON object in the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          answerData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        // Fallback if JSON parsing fails
        this.app.log.warn(`[WorkflowService] Failed to parse JSON response: ${text}`);
        answerData = {
          answer: text.replace(/```json\s*|\s*```/g, '').trim(),
          context_used: "fallback"
        };
      }

      // Save AI's answer to DB
      const projectsService = new (await import('../projects/projects.service')).ProjectsService(this.app);
      await projectsService.createMessage(projectId, user.id, {
        role: "assistant",
        content: answerData.answer,
      });

      // Store conversation in memory queue for future learning (비동기)
      messageQueue.enqueue({
        userId: user.id,
        projectId,
        userMessage: prompt,
        aiResponse: answerData.answer,
        context,
        metadata: {
          intent: 'question',
          success: true,
          userSatisfaction: 'neutral' // TODO: 실제 만족도 측정
        }
      });

      // Send answer via SSE
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: "question_answered",
          payload: {
            question: prompt,
            answer: answerData.answer,
            contextUsed: answerData.context_used,
            timestamp: new Date().toISOString()
          }
        });
      }

      this.app.log.info(`[WorkflowService] Question answered: "${prompt}" -> "${answerData.answer}"`);

      return {
        id: `question_${Date.now()}`,
        answer: answerData.answer,
        status: "answered"
      };

    } catch (error) {
      this.app.log.error(error, `[WorkflowService] Failed to answer question`);

      const fallbackAnswer = "죄송합니다. 질문에 답변할 수 없습니다.";

      // Save fallback answer to DB
      try {
        const projectsService = new (await import('../projects/projects.service')).ProjectsService(this.app);
        await projectsService.createMessage(projectId, user.id, {
          role: "assistant",
          content: fallbackAnswer,
        });
      } catch (dbError) {
        this.app.log.error(dbError, `[WorkflowService] Failed to save fallback answer to DB`);
      }

      // Store failed conversation in memory queue (비동기)
      messageQueue.enqueue({
        userId: user.id,
        projectId,
        userMessage: prompt,
        aiResponse: fallbackAnswer,
        context,
        metadata: {
          intent: 'question',
          success: false,
          userSatisfaction: 'negative'
        }
      });

      // Send fallback answer via SSE
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: "question_answered",
          payload: {
            question: prompt,
            answer: fallbackAnswer,
            contextUsed: "error_fallback",
            timestamp: new Date().toISOString()
          }
        });
      }

      return {
        id: `question_error_${Date.now()}`,
        answer: fallbackAnswer,
        status: "error"
      };
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

    // Generate dynamic prompt based on user history and patterns
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
