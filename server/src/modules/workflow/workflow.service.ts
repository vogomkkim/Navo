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

export class WorkflowService {
  private app: FastifyInstance;
  private model: any;

  constructor(app: FastifyInstance) {
    this.app = app;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async run(prompt: string, user: { id: string }): Promise<any> {
    this.app.log.info(`[WorkflowService] Received prompt: "${prompt}"`);
    const plan = await this.generatePlan(prompt, user);
    this.app.log.info({ plan }, '[WorkflowService] Generated Plan');

    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error('AI Planner returned an invalid plan.');
    }

    const outputs = await workflowExecutor.execute(this.app, plan);
    this.app.log.info({ outputs: Object.fromEntries(outputs) }, '[WorkflowService] Workflow executed successfully');

    return { plan, outputs: Object.fromEntries(outputs) };
  }

  private async generatePlan(prompt: string, user: { id: string }): Promise<Plan> {
    const availableTools = toolRegistry.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    const memberships = await db()
      .select({ organizationId: usersToOrganizations.organizationId })
      .from(usersToOrganizations)
      .where(eq(usersToOrganizations.userId, user.id))
      .limit(1);
    const organizationId = memberships[0]?.organizationId;

    if (!organizationId) {
      throw new Error(`User ${user.id} has no organization.`);
    }

    const plannerPrompt = `
      You are an expert AI Planner. Your job is to take a user's request and create a detailed, step-by-step execution plan using ONLY the available tools.

      **User Request:**
      "${prompt}"

      **Context (Use these exact values):**
      - User ID: "${user.id}"
      - Organization ID: "${organizationId}"

      **Available Tools:**
      ${JSON.stringify(availableTools, null, 2)}

      **Your Task:**
      Generate a JSON object that represents a valid "Plan".
      - For a "create project" request, you MUST use the "User ID" and "Organization ID" provided in the Context.
      - The sequence MUST be:
        1. 'create_project_in_db': Use the real 'organizationId' and 'userId' from the Context.
        2. 'create_project_architecture': Its 'projectId' input MUST reference the 'id' of the 'create_project_in_db' step's output.
        3. 'update_project_from_architecture': Saves the architecture.
            - Its 'projectId' input MUST reference the 'id' from 'create_project_in_db'.
            - Its 'architecture' input MUST reference the 'project' property of the 'create_project_architecture' step's output. Example: "\${steps.create_project_architecture_step.outputs.project}"

      **Output Format (JSON only):**
      {
        "name": "Descriptive plan name",
        "description": "Brief description.",
        "steps": [
          {
            "id": "unique_step_id",
            "tool": "tool_name_from_list",
            "inputs": { "param1": "value1" }
          }
        ]
      }

      Respond with ONLY the JSON object.
    `;

    try {
      const result = await this.model.generateContent(plannerPrompt);
      let text = result.response.text();

      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = text.match(jsonRegex);
      if (match && match[1]) {
        text = match[1];
      } else {
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        if (startIndex > -1 && endIndex > -1) {
          text = text.substring(startIndex, endIndex + 1);
        }
      }

      const refinedJson = await refineJsonResponse<Plan>(text);
      return typeof refinedJson === 'string' ? JSON.parse(refinedJson) : refinedJson;
    } catch (error: any) {
      this.app.log.error(error, 'Failed to generate or parse plan from LLM.');
      throw new Error('Failed to parse JSON from LLM response.');
    }
  }
}
