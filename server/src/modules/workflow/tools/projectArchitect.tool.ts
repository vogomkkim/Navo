/**
 * @file Defines the create_project_architecture tool, which inherits the core logic
 * from the original ProjectArchitectAgent.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

import { ExecutionContext, Tool } from '../types';
import { refineJsonResponse } from '../utils/jsonRefiner';

// This type should be more specific based on the actual request structure.
// For now, we'll keep it simple.
type ProjectRequest = {
  name: string;
  description: string;
  type: string;
};

// Initialize the AI model once
const modelName = "gemini-2.5-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: modelName });

async function designArchitectureWithAI(request: ProjectRequest): Promise<any> {
  // This function encapsulates the multi-step design process from the original agent.
  // For simplicity, we are combining the prompts here. A more advanced version
  // could still run this as a sequence of internal calls.

  const prompt = `
      You are a Project Architect AI. Based on the user's request, generate a complete project architecture in a single JSON response.

      **User Request:**
      - Project Name: ${request.name}
      - Description: ${request.description}
      - Type: ${request.type}

      **Your Task:**
      Generate a JSON object with a single root key "project".
      The "project" object must contain the following keys:
      1.  **name, description, type**: Basic project info.
      2.  **pages**: An array of page objects (name, path, description).
      3.  **components**: An array of component objects (name, type, description, props).
      4.  **file_structure**: A hierarchical structure of folders and files.

      **JSON Output Example:**
      {
        "project": {
          "name": "QuizMaster",
          "description": "An AI-powered quiz platform.",
          "type": "web-application",
          "pages": [
            { "name": "Home", "path": "/", "description": "Main landing page" },
            { "name": "Quiz", "path": "/quiz/:id", "description": "Page to take a quiz" }
          ],
          "components": [
            { "name": "Header", "type": "layout", "description": "Site header" },
            { "name": "QuizCard", "type": "ui", "description": "Displays a quiz question" }
          ],
          "file_structure": {
            "type": "folder",
            "name": "QuizMaster",
            "children": [
              { "type": "file", "name": "package.json", "content": "{"name": "quiz-master", "version": "1.0.0"}" },
              { "type": "file", "name": "README.md", "content": "# QuizMaster\n\nAn AI-powered quiz platform." }
            ]
          }
        }
      }

      **Instructions:**
      - Respond with ONLY the JSON object. No markdown fences, no explanations.
      - Be creative and logical in your design.
      - For the 'package.json' file, include at least a 'name' and 'version' key.
      - For the 'README.md' file, include at least a main heading with the project name.
    `;

  const result = await model.generateContent(prompt);
  let text = result.response.text();

  // Refine the response to ensure it's a valid JSON string
  // This is a common step when working with LLMs.
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(jsonRegex);
  if (match && match[1]) {
    text = match[1];
  }

  // Even after extracting, there might be surrounding text. Let's try to find the start of the JSON.
  const jsonStartIndex = text.indexOf('{');
  if (jsonStartIndex > -1) {
    text = text.substring(jsonStartIndex);
  }

  const refinedJson = await refineJsonResponse<string>(text);

  if (typeof refinedJson === 'object') {
    return refinedJson; // Already parsed, return directly
  }
  return JSON.parse(refinedJson as string);
}

export const createProjectArchitectureTool: Tool = {
  name: 'create_project_architecture',
  description:
    "Analyzes a user's project request and generates a detailed project architecture, including file structure and technology stack.",
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
      project: { type: 'object' }, // In a real scenario, this would be a detailed schema
    },
  },
  async execute(
    context: ExecutionContext,
    input: ProjectRequest
  ): Promise<any> {
    console.log(
      `[create_project_architecture] Starting architecture design for: ${input.name}`
    );
    try {
      const architecture = await designArchitectureWithAI(input);
      // TODO: Add validation logic here, similar to the original agent's validateProjectStructure
      console.log(
        `[create_project_architecture] Successfully designed architecture for: ${input.name}`
      );
      return architecture;
    } catch (error: any) {
      console.error(
        `[create_project_architecture] Failed to design architecture for "${input.name}":`,
        error
      );
      throw error;
    }
  },
};
