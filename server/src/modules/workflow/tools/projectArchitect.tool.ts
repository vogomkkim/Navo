/**
 * @file Defines the create_project_architecture tool, which acts as a specialized AI architect.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExecutionContext, Tool } from '../types';
import { refineJsonResponse } from '../utils/jsonRefiner';

type ProjectRequest = {
  name: string;
  description: string;
  type: string;
};

// Initialize the AI model once
const modelName = 'gemini-2.5-flash';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: modelName });

// Load the prompt template from the external file
const cwd: string =
  path.parse(process.cwd()).base === "server"
    ? process.cwd()
    : path.resolve(process.cwd(), "server");
const promptTemplate = fs.readFileSync(
  path.resolve(
    cwd,
    "src",
    "prompts",
    "project-architect.prompt.txt"
  ),
  "utf-8"
);

async function designArchitectureWithAI(request: ProjectRequest): Promise<any> {
  const prompt = promptTemplate
    .replace('{{projectName}}', request.name)
    .replace('{{projectDescription}}', request.description)
    .replace('{{projectType}}', request.type);

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const refinedJson = await refineJsonResponse<any>(text);

  if (typeof refinedJson === 'object') {
    return refinedJson;
  }
  return JSON.parse(refinedJson as string);
}

export const createProjectArchitectureTool: Tool = {
  name: 'create_project_architecture',
  description:
    "Analyzes a user's project request and generates a detailed project architecture, including file structure and technology stack, following Navo's specific Next.js conventions.",
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'The name of the project.' },
      description: {
        type: 'string',
        description: 'A description of the project.',
      },
      type: {
        type: 'string',
        description: 'The type of project (e.g., web-application).',
      },
    },
    required: ['name', 'description', 'type'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      project: { type: 'object' },
    },
  },
  async execute(
    context: ExecutionContext,
    input: ProjectRequest
  ): Promise<any> {
    context.app.log.info(`[ArchitectTool] Starting architecture design for: ${input.name}`);
    try {
      const architecture = await designArchitectureWithAI(input);
      // TODO: Add Zod validation for the returned blueprint structure.
      context.app.log.info(`[ArchitectTool] Successfully designed architecture for: ${input.name}`);
      return architecture;
    } catch (error: any) {
      context.app.log.error(error, `[ArchitectTool] Failed to design architecture for "${input.name}"`);
      throw error;
    }
  },
};
