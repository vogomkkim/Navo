import { FastifyInstance } from 'fastify';
import {
  OrchestrationResult,
  AgentContext,
  AgentResponse,
  Agent,
  Tool,
  Executable,
  Intent,
} from './types';
import * as fs from 'fs/promises';
import * as path from 'path';
// Phase 2: Import the advanced IntentAnalyzer
import { intentAnalyzer } from '@/modules/ai/core/intentAnalyzer';
import { IntentAnalysis } from '@/modules/ai/core/types/intent';

// Phase 1 MVP: Simple Greeting Agent
class GreetingAgent implements Agent {
  name: string = 'GreetingAgent';

  async execute(context: AgentContext, input: any): Promise<AgentResponse> {
    context.app.log.info(`[${this.name}] Executing with input: ${JSON.stringify(input)}`);
    const userName = input.userName || 'User';
    return {
      status: 'success',
      output: `Hello, ${userName}! Welcome to Navo.`,
    };
  }
}

// Phase 2: Simple File System Tool
class FileSystemTool implements Tool {
  name: string = 'FileSystemTool';
  description: string = 'Performs file system operations like listing files.';

  async execute(context: AgentContext, input: { operation: string; path?: string }): Promise<AgentResponse> {
    context.app.log.info(`[${this.name}] Executing with input: ${JSON.stringify(input)}`);
    
    if (input.operation === 'listFiles') {
      try {
        const targetPath = input.path || '.';
        // Basic security measure: prevent directory traversal
        const safePath = path.resolve(targetPath);
        if (!safePath.startsWith(path.resolve('.'))) {
             return { status: 'error', error: 'Access denied.' };
        }
        
        const files = await fs.readdir(safePath);
        return { status: 'success', output: files };
      } catch (error: any) {
        return { status: 'error', error: `Failed to list files: ${error.message}` };
      }
    }
    
    return { status: 'error', error: `Unsupported operation: ${input.operation}` };
  }
}

export class OrchestratorService {
  private app: FastifyInstance;
  private executables: Map<string, Executable>;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.executables = new Map<string, Executable>();
    // Register agents and tools
    this.register(new GreetingAgent());
    this.register(new FileSystemTool());
  }

  private register(executable: Executable) {
    this.executables.set(executable.name, executable);
    this.app.log.info(`[OrchestratorService] Registered executable: ${executable.name}`);
  }

  // Phase 2: Use the advanced IntentAnalyzer
  private async analyzeIntent(userMessage: string): Promise<Intent> {
    this.app.log.info(`[OrchestratorService] Analyzing intent for: "${userMessage}"`);
    
    // Call the centralized intent analyzer
    const analysis: IntentAnalysis = await intentAnalyzer.analyzeIntent(userMessage, {});

    // Adapter: Convert the detailed analysis into a simple Intent for the orchestrator
    // We'll use the 'routing_key' to determine the executable.
    // The 'actions' array provides the parameters.
    const executableName = analysis.routing_key || 'GreetingAgent'; // Default to GreetingAgent
    const input = analysis.actions?.[0]?.parameters || {};

    this.app.log.info({ analysis, executableName, input }, 'Intent analysis complete');

    return {
      executableName,
      input,
    };
  }

  async processUserRequest(userMessage: string): Promise<OrchestrationResult> {
    this.app.log.info(`[OrchestratorService] Processing user request: "${userMessage}"`);

    // Check for GEMINI_API_KEY
    if (!process.env.GEMINI_API_KEY) {
        const errorMsg = 'GEMINI_API_KEY is not set in the environment.';
        this.app.log.error(errorMsg);
        return { ok: false, message: 'Configuration Error', error: errorMsg };
    }

    const intent = await this.analyzeIntent(userMessage);
    
    const executable = this.executables.get(intent.executableName);
    if (!executable) {
      const errorMsg = `No executable found for intent: ${intent.executableName}`;
      this.app.log.error(errorMsg);
      return { ok: false, message: 'Internal Error', error: errorMsg };
    }

    try {
      const agentContext: AgentContext = { app: this.app };
      const response = await executable.execute(agentContext, intent.input);

      if (response.status === 'success') {
        return { ok: true, message: 'Request processed successfully', data: response.output };
      } else {
        return { ok: false, message: 'Execution failed', error: response.error };
      }
    } catch (error: any) {
      this.app.log.error(error, `Error during ${executable.name} execution`);
      return { ok: false, message: 'Error during orchestration', error: error.message };
    }
  }
}
