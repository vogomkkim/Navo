/**
 * @file The core service for the workflow engine.
 * This service orchestrates the AI planning and execution process.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FastifyInstance } from 'fastify';

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

  /**
   * Takes a user prompt, generates a plan, and executes it.
   * @param prompt The natural language request from the user.
   */
  async run(prompt: string): Promise<any> {
    this.app.log.info(`[WorkflowService] Received prompt: "${prompt}"`);

    // 1. Generate the Plan using the AI Planner
    const plan = await this.generatePlan(prompt);
    this.app.log.info({ plan }, '[WorkflowService] Generated Plan');

    // Validate the plan immediately after generation
    if (!plan || !Array.isArray(plan.steps)) {
      this.app.log.error(
        { plan },
        '[WorkflowService] AI Planner returned a plan without a valid "steps" array.'
      );
      throw new Error('AI Planner returned an invalid plan.');
    }

    // 2. Execute the Plan
    const outputs = await workflowExecutor.execute(plan);
    this.app.log.info(
      { outputs: Object.fromEntries(outputs) },
      '[WorkflowService] Workflow executed successfully'
    );

    // 3. Return the final result (for now, we return all outputs)
    // In the future, we might have a dedicated "ResultFormatter" tool.
    return {
      plan,
      outputs: Object.fromEntries(outputs),
    };
  }

  /**
   * The AI Planner. It takes a prompt and generates a Plan JSON object.
   * @param prompt The user's request.
   */
  private async generatePlan(prompt: string): Promise<Plan> {
    const availableTools = toolRegistry.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    const plannerPrompt = `
      You are an expert AI Planner. Your job is to take a user's request and create a detailed, step-by-step execution plan using the available tools.

      **User Request:**
      "${prompt}"

      **Available Tools:**
      ${JSON.stringify(availableTools, null, 2)}

      **Your Task:**
      Generate a JSON object that represents a valid "Plan". A Plan is a DAG (Directed Acyclic Graph) of steps.
      - Each step must use one of the available tools.
      - The 'inputs' for a step can reference outputs from previous steps using the format: \${steps.STEP_ID.outputs.PROPERTY_NAME}
      - Ensure all necessary steps are included to fulfill the user's request.
      - For a "create project" or "create website" request, the plan MUST follow this sequence:
        1. 'create_organization': To create a tenant for the new project. You will need to invent a suitable organization name and assume a placeholder 'ownerId' like "c1b2a3d4-e5f6-7890-1234-567890abcdef".
        2. 'create_project_in_db': To create the initial project record in the database.
            - Its 'organizationId' input MUST be a reference to the 'id' of the 'create_organization' step's output.
            - Its 'name' and 'description' inputs should be derived from the user's prompt.
            - Its 'userId' input MUST be the same placeholder 'ownerId' used in the 'create_organization' step.
        3. 'create_project_architecture': To design the detailed structure of the project.
            - Its 'projectId' input MUST be a reference to the 'id' of the 'create_project_in_db' step's output.
            - Its 'prompt' input should be the original user request.
        4. 'update_project_from_architecture': To save the designed architecture to the database.
            - Its 'projectId' input MUST be a reference to the 'id' of the 'create_project_in_db' step's output.
            - Its 'architecture' input MUST be a reference to the 'project' property of the 'create_project_architecture' step's output.
      - After this sequence, you can add other steps like generating components or pages, which would then use the project ID from the 'create_project_in_db' step.

      **Output Format (JSON only):**
      {
        "name": "A descriptive name for the plan",

      **Output Format (JSON only):**
      {
        "name": "A descriptive name for the plan",
        "description": "A brief description of what the plan does.",
        "steps": [
          {
            "id": "a_unique_step_id",
            "tool": "tool_name_from_the_list",
            "inputs": {
              "param1": "value1",
              "param2": "\${steps.another_step_id.outputs.some_property}"
            },
            "dependencies": ["another_step_id"]
          }
        ]
      }

      Respond with ONLY the JSON object. Do not include markdown fences or any other text.
    `;

    try {
      const result = await this.model.generateContent(plannerPrompt);
      let text = result.response.text();

      // Clean up potential markdown fences and other non-JSON text
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
      const planObject =
        typeof refinedJson === 'string' ? JSON.parse(refinedJson) : refinedJson;

      if (!planObject || !Array.isArray(planObject.steps)) {
        this.app.log.error(
          { plan: planObject },
          '[WorkflowService] AI Planner returned a plan without a valid "steps" array.'
        );
        throw new Error('AI Planner returned an invalid plan.');
      }

      return planObject;
    } catch (error: any) {
      this.app.log.error(
        error,
        '[WorkflowService] Failed to generate or parse plan from LLM.'
      );
      throw new Error('Failed to parse JSON from LLM response.');
    }
  }
}
