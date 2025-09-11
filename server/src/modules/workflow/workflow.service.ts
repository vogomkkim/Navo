/**
 * @file The core service for the workflow engine.
 */
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FastifyInstance } from 'fastify';

import { db } from '@/db/db.instance';
import { usersToOrganizations } from '@/drizzle/schema';
import { toolRegistry, workflowExecutor } from './index';
import { Plan } from './types';
import { refineJsonResponse } from './utils/jsonRefiner';
import { ProjectType, getAvailableTools } from './toolCategories';

// Define the structure of the context object coming from the frontend
interface MessageContext {
  activeView?: 'editor' | 'preview';
  activeFile?: string | null;
  activePreviewRoute?: string | null;
}

export class WorkflowService {
  private app: FastifyInstance;
  private model: any;

  constructor(app: FastifyInstance) {
    this.app = app;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async run(
    prompt: string,
    user: { id: string },
    chatHistory: any[],
    projectId?: string,
    context?: MessageContext
  ): Promise<any> {
    this.app.log.info(
      `[WorkflowService] Received prompt: "${prompt}" for project ${projectId} with history and context.`
    );
    const plan = await this.generatePlan(prompt, user, chatHistory, projectId, context);
    this.app.log.info({ plan }, '[WorkflowService] Generated Plan');

    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error('AI Planner returned an invalid plan.');
    }

    const enhancedPlan = this.enhancePlanWithContext(plan, user, projectId);

    const outputs = await workflowExecutor.execute(
      this.app,
      enhancedPlan,
      {},
      { projectId, userId: user.id }
    );
    this.app.log.info(
      { outputs: Object.fromEntries(outputs) },
      '[WorkflowService] Workflow executed successfully'
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
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.message || '' }],
    }));

    const plannerPrompt = `
You are an expert AI Planner. Your job is to analyze a user's request and create a step-by-step execution plan using ONLY the available tools.

**Intelligent Target Inference Guidelines (VERY IMPORTANT):**
You MUST determine the target file(s) for the user's request by following these rules in ORDER:

1.  **Explicit User Intent:** If the user's message explicitly mentions a file, component, or feature (e.g., "modify the login page", "update 'utils.ts'"), this is your highest priority.

2.  **Contextual Metadata:** If the user's message is ambiguous (e.g., "change this button"), use the following metadata as a strong hint.
    - User's Active View: "${context.activeView || 'unknown'}"
    - Active File in Editor: "${context.activeFile || 'none'}"
    - Active Route in Preview: "${context.activePreviewRoute || 'none'}"
    An ambiguous request likely refers to the "Active File in Editor".

3.  **Conversation History:** If intent and metadata are insufficient, analyze the conversation history to find the context.

**Available Tools:**
${JSON.stringify(availableTools, null, 2)}

**Your Task:**
Generate a JSON object that represents a valid "Plan".
- A plan to create a new project MUST start with 'create_project_in_db', then 'create_project_architecture', and then 'compile_blueprint_to_vfs'.
- A plan to modify an existing project should use tools like 'create_project_architecture' followed by 'compile_blueprint_to_vfs' to update files.

**Example Plan (for modifying an existing file):**
{
  "name": "Update Main Page Content",
  "description": "Redesign the main page based on user feedback.",
  "steps": [
    {
      "id": "step1_design_update",
      "tool": "create_project_architecture",
      "inputs": { "name": "Korean Greeting Project", "description": "Update the main page with a title, button, and dynamic greeting text, and apply a modern design.", "type": "web-application" }
    },
    {
      "id": "step2_compile_update",
      "tool": "compile_blueprint_to_vfs",
      "inputs": {
        "projectId": "${projectId}",
        "blueprint": "${step1_design_update}"
      }
    }
  ]
}

Respond with ONLY the raw JSON object, without any markdown formatting.
`;

    const chat = this.model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(
      `Latest User Request: "${prompt}"\n\n${plannerPrompt}`
    );
    
    const rawText: string = result?.response?.text?.() ?? '';
    let parsedPlan: Plan;
    try {
      const refined = await refineJsonResponse<Plan>(rawText);
      parsedPlan = typeof refined === 'string' ? JSON.parse(refined) : refined;
    } catch (error) {
      this.app.log.error({ error, rawText }, '[WorkflowService] Failed to parse Plan JSON');
      throw new Error('Failed to parse Plan JSON from AI response.');
    }

    return parsedPlan;
  }
}