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
import { intentAnalyzer } from '@/modules/ai/core/intentAnalyzer';
import { IntentAnalysis } from '@/modules/ai/core/types/intent';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PagesService } from '@/modules/pages/pages.service';
import { ComponentsService } from '@/modules/components/components.service';
// import { ProjectsService } from '@/modules/projects/projects.service'; // Removed direct dependency

class GreetingAgent implements Agent {
  name: string = 'GreetingAgent';
  async execute(context: AgentContext, input: any): Promise<AgentResponse> {
    context.app.log.info(`[${this.name}] Executing with input: ${JSON.stringify(input)}`);
    const userName = input.userName || 'User';
    return { status: 'success', output: `Hello, ${userName}! Welcome to Navo.` };
  }
}

class FileSystemTool implements Tool {
  name: string = 'FileSystemTool';
  description: string = 'Performs file system operations like listing files.';
  async execute(context: AgentContext, input: { operation: string; path?: string }): Promise<AgentResponse> {
    context.app.log.info(`[${this.name}] Executing with input: ${JSON.stringify(input)}`);
    if (input.operation === 'listFiles') {
      try {
        const targetPath = input.path || '.';
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

class ShellTool implements Tool {
  name: string = 'ShellTool';
  description: string = 'Executes allowed shell commands.';
  private execAsync = promisify(exec);
  private readonly allowedCommands = new Set(['pwd', 'ls', 'echo', 'cd', 'dir']);

  async execute(context: AgentContext, input: { command: string }): Promise<AgentResponse> {
    context.app.log.info(`[${this.name}] Executing with input: ${JSON.stringify(input)}`);
    if (!input || !input.command) {
      return { status: 'error', error: 'Command is required.' };
    }
    let commandToExecute = input.command;
    const commandParts = commandToExecute.trim().split(' ');
    let baseCommand = commandParts[0];
    if (process.platform === 'win32') {
      if (baseCommand === 'ls') baseCommand = 'dir';
      if (baseCommand === 'pwd') baseCommand = 'cd';
    }
    if (process.platform === 'win32' && baseCommand === 'cd' && commandParts.length === 1) {
      commandToExecute = 'echo %cd%';
    } else {
      commandToExecute = [baseCommand, ...commandParts.slice(1)].join(' ');
    }
    if (!this.allowedCommands.has(baseCommand)) {
      return { status: 'error', error: `Command not allowed: ${baseCommand}` };
    }
    try {
      const { stdout, stderr } = await this.execAsync(commandToExecute, { timeout: 5000 });
      if (stderr) {
        context.app.log.warn(`[${this.name}] Command stderr: ${stderr}`);
      }
      return { status: 'success', output: stdout.trim() };
    } catch (error: any) {
      context.app.log.error(error, `[${this.name}] Command execution failed`);
      return { status: 'error', error: `Failed to execute command: ${error.message}` };
    }
  }
}

class ProjectEditorTool implements Tool {
  name: string = 'ProjectEditorTool';
  description: 'Edits project content like adding components to pages.';
  private pagesService: PagesService;
  private componentsService: ComponentsService;

  constructor(app: FastifyInstance) {
    this.pagesService = new PagesService(app);
    this.componentsService = new ComponentsService(app);
  }

  async execute(context: AgentContext, input: any): Promise<AgentResponse> {
    const logger = context.app.log;
    logger.info(`[${this.name}] Executing with input: ${JSON.stringify(input)}`);
    const { operation, pageName, componentType, projectId, userId } = input;

    if (operation === 'addComponent') {
      try {
        // projectId is now expected to be in the input
        if (!projectId) {
          return { status: 'error', error: 'projectId가 필요합니다.' };
        }

        logger.info("Step 1: Finding page by path...");
        const pagePath = pageName === '홈' ? '/' : `/${pageName}`;
        const page = await this.pagesService.getPageByPath(projectId, pagePath, userId);
        logger.info({ pageId: page.id }, "Step 1 Success: Found page.");

        logger.info("Step 2: Finding component definition by name...");
        const componentDef = await this.componentsService.getComponentDefinitionByName(componentType, projectId, userId);
        logger.info({ definitionId: componentDef.id }, "Step 2 Success: Found component definition.");

        logger.info("Step 3: Creating component instance...");
        const newInstance = await this.componentsService.createComponentInstance(page.id, componentDef.id, userId);
        logger.info({ instanceId: newInstance.id }, "Step 3 Success: Created component instance.");

        return {
          status: 'success',
          output: `'${page.name}' 페이지에 '${componentDef.displayName}' 컴포넌트를 성공적으로 추가했습니다.`,
        };
      } catch (error: any) {
        logger.error(error, `[${this.name}] 컴포넌트 추가 실패`);
        return { status: 'error', error: `컴포넌트 추가 실패: ${error.message}` };
      }
    }
    return { status: 'error', error: `지원하지 않는 작업입니다: ${operation}` };
  }
}

export class OrchestratorService {
  private app: FastifyInstance;
  private executables: Map<string, Executable>;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.executables = new Map<string, Executable>();
    this.register(new GreetingAgent());
    this.register(new FileSystemTool());
    this.register(new ShellTool());
    this.register(new ProjectEditorTool(app));
  }

  private register(executable: Executable) {
    this.executables.set(executable.name, executable);
    this.app.log.info(`[OrchestratorService] Registered executable: ${executable.name}`);
  }

  private async analyzeIntent(userMessage: string, userId: string): Promise<Intent> {
    this.app.log.info(`[OrchestratorService] Analyzing intent for: "${userMessage}"`);
    const analysis: IntentAnalysis = await intentAnalyzer.analyzeIntent(userMessage, { userId });
    const executableName = analysis.routing_key || 'GreetingAgent';
    let input = analysis.actions?.[0]?.parameters || {};
    
    // For now, we will manually add projectId for testing.
    // This should be replaced with a proper context management system later.
    const tempProjectId = "fcb01bee-24bc-4da4-9c31-83c77e182d7c";

    if (['ProjectEditorTool'].includes(executableName)) {
      input = { ...input, userId, projectId: tempProjectId };
    }
    this.app.log.info({ analysis, executableName, input }, 'Intent analysis complete');
    return { executableName, input };
  }

  async processUserRequest(userMessage: string, userId: string): Promise<OrchestrationResult> {
    this.app.log.info(`[OrchestratorService] Processing user request: "${userMessage}"`);
    if (!process.env.GEMINI_API_KEY) {
      const errorMsg = 'GEMINI_API_KEY is not set in the environment.';
      this.app.log.error(errorMsg);
      return { ok: false, message: 'Configuration Error', error: errorMsg };
    }
    const intent = await this.analyzeIntent(userMessage, userId);
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
        this.app.log.warn({ error: response.error }, `Execution failed for ${executable.name}`);
        return { ok: false, message: 'Execution failed', error: response.error };
      }
    } catch (error: any) {
      this.app.log.error(error, `Error during ${executable.name} execution`);
      return { ok: false, message: 'Error during orchestration', error: error.message };
    }
  }
}
