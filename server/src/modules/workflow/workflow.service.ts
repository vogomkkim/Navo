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
    projectId?: string
  ): Promise<any> {
    this.app.log.info(
      `[WorkflowService] Received prompt: "${prompt}" for project ${projectId} with history.`
    );
    const plan = await this.generatePlan(prompt, user, chatHistory, projectId);
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
    projectId?: string
  ): Promise<Plan> {
    const projectType = this.determineProjectType(projectId);
    const appropriateTools = getAvailableTools(projectType);
    const availableTools = appropriateTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      priority: tool.priority,
      inputSchema: toolRegistry.get(tool.name)?.inputSchema || {},
    }));

    this.app.log.info(
      `[WorkflowService] Using ${projectType} project type with ${availableTools.length} appropriate tools`
    );

    const memberships = await db
      .select({ organizationId: usersToOrganizations.organizationId })
      .from(usersToOrganizations)
      .where(eq(usersToOrganizations.userId, user.id))
      .limit(1);
    const organizationId = memberships[0]?.organizationId;

    if (!organizationId) {
      throw new Error(`User ${user.id} has no organization.`);
    }

    // Convert our internal chat history format to the format expected by Google's API
    const formattedHistory = chatHistory.map((item: any) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.message || '' }],
    }));

    const plannerPrompt = `
You are an expert AI Planner. Your job is to take a user's request and create a detailed, step-by-step execution plan using ONLY the available tools, based on the full conversation context.

IMPORTANT: This is a VFS-based project. Always prefer VFS tools over local file system tools.
Backends must be implemented as Deno serverless functions (like Supabase). Do NOT generate Fastify or long-running servers.
Priority order: VFS tools (create_vfs_file, create_vfs_directory) > Serverless tools (generate_deno_functions_from_blueprint) > Database tools > Other tools

Context (Use these exact values):
- User ID: "${user.id}"
- Organization ID: "${organizationId}"
- Project Type: ${projectType} (VFS-based)
${projectId ? `- Project ID: "${projectId}"` : ''}

Available Tools (sorted by priority):
${JSON.stringify(availableTools, null, 2)}

Your Task:
Generate a JSON object that represents a valid "Plan" with fields { name: string, description: string, steps: Array<{ id: string; tool: string; inputs: Record<string, any>; dependencies?: string[] }> }.
Return ONLY the JSON. Do not include markdown fences or commentary.
`;

    // The chat session should include the history, the detailed prompt, and the user's latest message
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
      if (typeof refined === 'string') {
        parsedPlan = JSON.parse(refined) as Plan;
      } else {
        parsedPlan = refined as Plan;
      }
    } catch (error) {
      this.app.log.error({ error }, '[WorkflowService] 계획 JSON 파싱 실패');
      parsedPlan = {
        name: 'Fallback Plan',
        description: 'AI 계획 파싱 실패로 인해 빈 계획을 사용합니다.',
        steps: [],
      };
    }

    return parsedPlan;
  }
}
