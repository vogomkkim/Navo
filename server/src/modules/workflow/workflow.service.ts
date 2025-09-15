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

  async preparePlan(
    prompt: string,
    user: { id: string },
    chatHistory: any[],
    projectId?: string,
    context?: MessageContext,
  ): Promise<Plan> {
    this.app.log.info(
      `[WorkflowService] Preparing plan for prompt: "${prompt}" for project ${projectId}.`,
    );
    const plan = await this.generatePlan(
      prompt,
      user,
      chatHistory,
      projectId,
      context,
    );
    this.app.log.info({ plan }, '[WorkflowService] Generated Plan');

    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error('AI Planner returned an invalid plan.');
    }
    return plan;
  }

  async executePlan(
    plan: Plan,
    user: { id: string },
    projectId?: string,
  ): Promise<any> {
    this.app.log.info(
      `[WorkflowService] Executing plan: "${plan.name}" for project ${projectId}.`,
    );

    const enhancedPlan = this.enhancePlanWithContext(plan, user, projectId);

    const outputs = await workflowExecutor.execute(
      this.app,
      enhancedPlan,
      {},
      { projectId, userId: user.id },
    );
    this.app.log.info(
      { outputs: Object.fromEntries(outputs) },
      '[WorkflowService] Workflow executed successfully',
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

    **CONTEXT:**
    - User ID: ${user.id}
    - Organization ID: ${organizationId}
    - Current Project ID: ${projectId || 'N/A'}
    - User's Active View: "${context.activeView || 'unknown'}"
    - Active File in Editor: "${context.activeFile || 'none'}"
    - Active Route in Preview: "${context.activePreviewRoute || 'none'}"

    **Available Tools:**
    ${JSON.stringify(availableTools, null, 2)}

    **Your Task:**
    Generate a JSON object that represents a valid "Plan".
    - Each step in the plan MUST have a user-friendly "title" and "description".
    - A plan to create a new project MUST start with 'create_project_in_db', then 'create_project_architecture', and then 'compile_blueprint_to_vfs'.
    - A plan to modify an existing project should use tools like 'create_project_architecture' followed by 'compile_blueprint_to_vfs' to update files.

    **Example Plan (for creating a new project):**
    {
      "name": "Create New Korean Greeting Project",
      "description": "Create a simple web application that displays a Korean greeting.",
      "steps": [
        {
          "id": "step1_create_db_record",
          "title": "프로젝트 생성",
          "description": "데이터베이스에 새 프로젝트를 등록합니다.",
          "tool": "create_project_in_db",
          "inputs": { "name": "Korean Greeting Project", "description": "A simple web app.", "organizationId": "${organizationId}" }
        },
        {
          "id": "step2_design_architecture",
          "title": "애플리케이션 아키텍처 설계",
          "description": "요구사항에 맞춰 페이지와 컴포넌트 구조를 설계합니다.",
          "tool": "create_project_architecture",
          "inputs": { "name": "Korean Greeting Project", "description": "A simple web app with a title and a button.", "type": "web-application" }
        },
        {
          "id": "step3_scaffold_project",
          "title": "프로젝트 파일 생성",
          "description": "설계된 아키텍처에 따라 실제 파일과 폴더를 생성합니다.",
          "tool": "scaffold_project",
          "inputs": {
            "projectId": "{{step1_create_db_record.projectId}}",
            "blueprint": "{{step2_design_architecture.blueprint}}"
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