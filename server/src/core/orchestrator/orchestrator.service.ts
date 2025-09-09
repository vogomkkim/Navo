import { FastifyInstance } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WorkflowService } from '@/modules/workflow/workflow.service';
import { ProjectsService } from '@/modules/projects/projects.service';
import logger from '@/lib/logger';

interface AnalysisResult {
  intent: 'simple_chat' | 'create_project' | 'file_operation' | 'unknown';
  complexity: 'simple' | 'complex';
  confidence: number;
  summary: string;
}

export class OrchestratorService {
  private app: FastifyInstance;
  private model: any;
  private workflowService: WorkflowService;
  private projectsService: ProjectsService;

  constructor(app: FastifyInstance) {
    this.app = app;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.workflowService = new WorkflowService(app);
    this.projectsService = new ProjectsService(app);
  }

  async handleRequest(prompt: string, user: { id: string }, chatHistory: any[], projectId?: string): Promise<any> {
    this.app.log.info(`[Orchestrator] Analyzing prompt: "${prompt}" with history.`);
    const analysis = await this.analyzeIntent(prompt, chatHistory);
    this.app.log.info({ analysis }, '[Orchestrator] Intent analysis complete');

    if (analysis.intent === 'create_project' && analysis.complexity === 'complex') {
      this.app.log.info('[Orchestrator] Routing to Workflow Engine.');
      const workflowResult = await this.workflowService.run(prompt, user, chatHistory);
      return {
        type: 'WORKFLOW_RESULT',
        payload: {
          ...workflowResult,
          summaryMessage: '프로젝트 생성이 완료되었습니다! 파일 트리에서 결과를 확인하세요.',
        },
      };
    }

    if (analysis.intent === 'file_operation') {
      if (!projectId) {
        return {
          type: 'FILE_OPERATION_RESULT',
          payload: { message: '현재 프로젝트 컨텍스트가 없습니다. 프로젝트를 먼저 선택하거나 생성해주세요.' },
        };
      }

      const fileOp = await this.analyzeFileOperation(prompt, chatHistory);
      const result = await this.executeFileOperation(projectId, user.id, fileOp);
      return {
        type: 'FILE_OPERATION_RESULT',
        payload: result,
      };
    } else {
      this.app.log.info('[Orchestrator] Routing to Lightweight Responder.');
      const simpleResponse = await this.generateSimpleResponse(prompt, chatHistory);
      return {
        type: 'SIMPLE_CHAT',
        payload: simpleResponse,
      };
    }
  }

  private async analyzeIntent(prompt: string, chatHistory: any[]): Promise<AnalysisResult> {
    const analysisPrompt = `
      Analyze the user's latest prompt to determine the primary intent and complexity, using the provided conversation history for context.

      **Conversation History:**
      ${JSON.stringify(chatHistory, null, 2)}

      **Latest User Prompt:**
      "${prompt}"

      **Analysis Categories:**
      - **intent**: Choose one: 'simple_chat' (greetings, simple questions), 'create_project' (requests to build, generate, or modify a project), 'file_operation' (requests to read, write, or list files), 'unknown'.
      - **complexity**: Choose one: 'simple' (can be answered directly), 'complex' (requires multiple steps or tools).
      - **confidence**: A score from 0.0 to 1.0.
      - **summary**: A brief summary of the user's request in the context of the conversation.

      **Examples:**
      - History: [], Prompt: "블로그 만들어줘" -> intent: 'create_project', complexity: 'complex'
      - History: [{"role": "user", "message": "블로그 만들어줘"}, {"role": "assistant", "message": "완료되었습니다."}], Prompt: "거기에 다크모드 추가해줘" -> intent: 'create_project', complexity: 'complex'

      **Output Format (JSON only):**
      {
        "intent": "...",
        "complexity": "...",
        "confidence": ...,
        "summary": "..."
      }
    `;

    try {
      const result = await this.model.generateContent(analysisPrompt);
      const text = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text) as AnalysisResult;
      return parsed;
    } catch (error) {
      this.app.log.error(error, '[Orchestrator] Failed to analyze intent.');
      return {
        intent: 'unknown',
        complexity: 'simple',
        confidence: 0.0,
        summary: 'Intent analysis failed.',
      };
    }
  }

  private async generateSimpleResponse(prompt: string, chatHistory: any[]): Promise<{ message: string }> {
    const chatPrompt = `
      You are a helpful AI assistant. Respond to the user's latest message in a friendly and concise manner, using the conversation history for context.

      **Conversation History:**
      ${JSON.stringify(chatHistory, null, 2)}

      **Latest User Message:**
      "${prompt}"

      Your response (in Korean):
    `;
    try {
      const result = await this.model.generateContent(chatPrompt);
      const text = result.response.text();
      return { message: text };
    } catch (error) {
      this.app.log.error(error, '[Orchestrator] Failed to generate simple response.');
      return { message: '죄송합니다. 답변을 생성하는 데 문제가 발생했습니다.' };
    }
  }

  private async analyzeFileOperation(prompt: string, chatHistory: any[]): Promise<{ op: 'read' | 'create' | 'rename' | 'move' | 'delete' | 'update' | 'open'; path?: string; parentPath?: string; name?: string; newName?: string; newPath?: string; content?: string; }> {
    const analysisPrompt = `
      Extract a JSON instruction for a file operation from the user's message and conversation history.

      Conversation History:
      ${JSON.stringify(chatHistory, null, 2)}

      Latest Message:
      "${prompt}"

      Operations: read | create | rename | move | delete | update | open

      Fields by operation:
      - read/open: path
      - create: parentPath (or path's directory), name, optional content
      - rename: path, newName
      - move: path, newPath (target directory path)
      - delete: path
      - update: path, content (full replacement)

      Output strictly JSON with only these fields.
    `;
    try {
      const result = await this.model.generateContent(analysisPrompt);
      const text = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      return parsed;
    } catch (error) {
      this.app.log.error(error, '[Orchestrator] Failed to analyze file operation.');
      return { op: 'read' } as any;
    }
  }

  private async executeFileOperation(projectId: string, userId: string, instr: { op: string; path?: string; parentPath?: string; name?: string; newName?: string; newPath?: string; content?: string }): Promise<{ message: string; details?: any }> {
    const safe = (s?: string) => (typeof s === 'string' ? s.trim() : undefined);
    const op = String(instr.op || '').toLowerCase();

    switch (op) {
      case 'create': {
        const name = safe(instr.name);
        if (!name) return { message: '생성할 이름이 정의되지 않았습니다.' };
        const parentPath = safe(instr.parentPath) || (safe(instr.path)?.replace(/\/$/, '')?.split('/').slice(0, -1).join('/') || '/');
        const parentNode = await this.projectsService.findVfsNodeByPath(projectId, userId, parentPath || '/');
        if (!parentNode) return { message: `부모 경로를 찾을 수 없습니다: ${parentPath}` };
        const node = await this.projectsService.createVfsNode(projectId, userId, { parentId: parentNode.id, nodeType: instr.content != null ? 'FILE' : 'DIRECTORY', name, content: instr.content ?? null });
        return { message: `노드 생성 완료: ${parentPath}/${name}`, details: { node } };
      }
      case 'rename': {
        const path = safe(instr.path);
        const newName = safe(instr.newName);
        if (!path || !newName) return { message: '이름 변경에 필요한 정보(path, newName)가 부족합니다.' };
        const node = await this.projectsService.findVfsNodeByPath(projectId, userId, path);
        if (!node) return { message: `경로를 찾을 수 없습니다: ${path}` };
        const renamed = await this.projectsService.renameVfsNode(projectId, userId, { nodeId: node.id, newName });
        return { message: `이름 변경 완료: ${path} → ${newName}`, details: { node: renamed } };
      }
      case 'move': {
        const path = safe(instr.path);
        const newPath = safe(instr.newPath);
        if (!path || !newPath) return { message: '이동에 필요한 정보(path, newPath)가 부족합니다.' };
        const node = await this.projectsService.findVfsNodeByPath(projectId, userId, path);
        const targetDir = await this.projectsService.findVfsNodeByPath(projectId, userId, newPath);
        if (!node) return { message: `원본 경로를 찾을 수 없습니다: ${path}` };
        if (!targetDir) return { message: `대상 경로를 찾을 수 없습니다: ${newPath}` };
        const moved = await this.projectsService.moveVfsNode(projectId, userId, { nodeId: node.id, newParentId: targetDir.id });
        return { message: `이동 완료: ${path} → ${newPath}/${node.name}`, details: { node: moved } };
      }
      case 'delete': {
        const path = safe(instr.path);
        if (!path) return { message: '삭제할 경로가 필요합니다.' };
        const node = await this.projectsService.findVfsNodeByPath(projectId, userId, path);
        if (!node) return { message: `경로를 찾을 수 없습니다: ${path}` };
        await this.projectsService.deleteVfsNode(projectId, userId, { nodeId: node.id });
        return { message: `삭제 완료: ${path}` };
      }
      case 'update': {
        const path = safe(instr.path);
        if (!path || typeof instr.content !== 'string') return { message: '업데이트에는 path와 content가 필요합니다.' };
        const node = await this.projectsService.findVfsNodeByPath(projectId, userId, path);
        if (!node) return { message: `경로를 찾을 수 없습니다: ${path}` };
        const updated = await this.projectsService.updateVfsNodeContent(node.id, projectId, userId, instr.content);
        return { message: `내용 업데이트 완료: ${path} (${updated?.content?.length ?? 0}자)`, details: { node: updated } };
      }
      case 'read':
      case 'open': {
        const path = safe(instr.path);
        if (!path) return { message: '읽기/열기에는 path가 필요합니다.' };
        const node = await this.projectsService.findVfsNodeByPath(projectId, userId, path);
        if (!node) return { message: `경로를 찾을 수 없습니다: ${path}` };
        const fetched = await this.projectsService.getVfsNode(node.id, projectId, userId);
        return { message: `열기 완료: ${path}`, details: { node: fetched } };
      }
      default:
        return { message: `지원되지 않는 파일 작업입니다: ${instr.op}` };
    }
  }
}
