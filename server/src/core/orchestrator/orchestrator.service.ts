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
      const workflowResult = await this.workflowService.run(prompt, user, chatHistory, projectId);
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

  private async analyzeFileOperation(prompt: string, chatHistory: any[]): Promise<{ op: 'read' | 'create' | 'rename' | 'move' | 'delete' | 'update' | 'open' | 'patch'; path?: string; parentPath?: string; name?: string; newName?: string; newPath?: string; content?: string; patch?: string | { find: string; replace: string; isRegex?: boolean; flags?: string }; options?: { ignoreWhitespace?: boolean } }> {
    const analysisPrompt = `
      Extract a JSON instruction for a file operation from the user's message and conversation history.

      Conversation History:
      ${JSON.stringify(chatHistory, null, 2)}

      Latest Message:
      "${prompt}"

      Operations: read | create | rename | move | delete | update | open | patch

      Fields by operation:
      - read/open: path
      - create: parentPath (or path's directory), name, optional content
      - rename: path, newName
      - move: path, newPath (target directory path)
      - delete: path
      - update: path, content (full replacement). If the user asks for a modification without providing the full code, generate the complete new file content based on the conversation context.
      - patch: path, patch (either a diff-match-patch string, or an object { find, replace, isRegex?, flags? }), options (optional { ignoreWhitespace: boolean })

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

  private async executeFileOperation(
    projectId: string,
    userId: string,
    instr: { op: string; path?: string; parentPath?: string; name?: string; newName?: string; newPath?: string; content?: string; patch?: string | { find: string; replace: string } }
  ): Promise<{ status: 'ok' | 'clarify'; message: string; details?: any }> {
    const safe = (s?: string) => (typeof s === 'string' ? s.trim() : undefined);
    const op = String(instr.op || '').toLowerCase();

    switch (op) {
      case 'create': {
        const name = safe(instr.name);
        if (!name) return { status: 'clarify', message: '어떤 이름으로 생성할까요? 예: "utils/date.ts" 또는 이름만 알려주세요.' };
        const parentPath = safe(instr.parentPath) || (safe(instr.path)?.replace(/\/$/, '')?.split('/').slice(0, -1).join('/') || '/');
        const parentNode = await this.projectsService.findVfsNodeByPath(projectId, userId, parentPath || '/');
        if (!parentNode) return { status: 'clarify', message: `부모 경로를 찾을 수 없습니다: ${parentPath}. 생성할 위치(폴더 경로)를 알려주세요.` };
        const node = await this.projectsService.createVfsNode(projectId, userId, { parentId: parentNode.id, nodeType: instr.content != null ? 'FILE' : 'DIRECTORY', name, content: instr.content ?? null });
        return { status: 'ok', message: `노드 생성 완료: ${parentPath}/${name}`, details: { node } };
      }
      case 'rename': {
        const path = safe(instr.path);
        const newName = safe(instr.newName);
        if (!path) return { status: 'clarify', message: '어느 파일(경로)의 이름을 변경할까요?' };
        if (!newName) return { status: 'clarify', message: '무슨 이름으로 변경할까요?' };
        const node = await this.projectsService.findVfsNodeByPath(projectId, userId, path);
        if (!node) return { status: 'clarify', message: `경로를 찾을 수 없습니다: ${path}. 정확한 경로를 알려주세요.` };
        const renamed = await this.projectsService.renameVfsNode(projectId, userId, { nodeId: node.id, newName });
        return { status: 'ok', message: `이름 변경 완료: ${path} → ${newName}`, details: { node: renamed } };
      }
      case 'move': {
        const path = safe(instr.path);
        const newPath = safe(instr.newPath);
        if (!path) return { status: 'clarify', message: '어떤 파일(경로)을 옮길까요?' };
        if (!newPath) return { status: 'clarify', message: '어디로 옮길까요? 대상 폴더 경로를 알려주세요.' };
        const node = await this.projectsService.findVfsNodeByPath(projectId, userId, path);
        const targetDir = await this.projectsService.findVfsNodeByPath(projectId, userId, newPath);
        if (!node) return { status: 'clarify', message: `원본 경로를 찾을 수 없습니다: ${path}. 정확한 경로를 알려주세요.` };
        if (!targetDir) return { status: 'clarify', message: `대상 경로를 찾을 수 없습니다: ${newPath}. 정확한 폴더 경로를 알려주세요.` };
        const moved = await this.projectsService.moveVfsNode(projectId, userId, { nodeId: node.id, newParentId: targetDir.id });
        return { status: 'ok', message: `이동 완료: ${path} → ${newPath}/${node.name}`, details: { node: moved } };
      }
      case 'delete': {
        const path = safe(instr.path);
        if (!path) return { status: 'clarify', message: '어떤 파일(경로)을 삭제할까요?' };
        const node = await this.projectsService.findVfsNodeByPath(projectId, userId, path);
        if (!node) return { status: 'clarify', message: `경로를 찾을 수 없습니다: ${path}. 정확한 경로를 알려주세요.` };
        await this.projectsService.deleteVfsNode(projectId, userId, { nodeId: node.id });
        return { status: 'ok', message: `삭제 완료: ${path}` };
      }
      case 'update': {
        const path = safe(instr.path);
        if (!path) return { status: 'clarify', message: '어느 파일(경로)을 수정할까요?' };
        if (typeof instr.content !== 'string') return { status: 'clarify', message: '어떤 내용으로 바꿀까요? 전체 내용을 제공해주세요.' };
        const existing = await this.projectsService.findVfsNodeByPath(projectId, userId, path);
        if (!existing) {
          const createdOrUpdated = await this.projectsService.upsertVfsNodeByPath(projectId, userId, path, instr.content);
          return { status: 'ok', message: `파일 생성 및 내용 저장 완료: ${path} (${createdOrUpdated?.content?.length ?? 0}자)`, details: { node: createdOrUpdated } };
        }
        const updated = await this.projectsService.updateVfsNodeContent(existing.id, projectId, userId, instr.content);
        return { status: 'ok', message: `내용 업데이트 완료: ${path} (${updated?.content?.length ?? 0}자)`, details: { node: updated } };
      }
      case 'read':
      case 'open': {
        const path = safe(instr.path);
        if (!path) return { status: 'clarify', message: '어느 파일(경로)을 열까요?' };
        const node = await this.projectsService.findVfsNodeByPath(projectId, userId, path);
        if (!node) return { status: 'clarify', message: `경로를 찾을 수 없습니다: ${path}. 정확한 경로를 알려주세요.` };
        const fetched = await this.projectsService.getVfsNode(node.id, projectId, userId);
        return { status: 'ok', message: `열기 완료: ${path}`, details: { node: fetched } };
      }
      case 'patch': {
        const path = safe(instr.path);
        if (!path) return { status: 'clarify', message: '어느 파일(경로)에 패치를 적용할까요?' };
        if (!(typeof instr.patch === 'string' || (instr.patch && typeof (instr.patch as any).find === 'string'))) {
          return { status: 'clarify', message: '유효한 patch가 필요합니다. dmp 문자열 또는 { find, replace } 객체를 제공하세요.' };
        }
        const updatedNode = await this.projectsService.applyPatchVfsNodeByPath(projectId, userId, path, instr.patch as any, (instr as any).options);
        return { status: 'ok', message: `패치 적용 완료: ${path}`, details: { node: updatedNode } };
      }
      default:
        return { status: 'clarify', message: `지원되지 않는 파일 작업입니다: ${instr.op}` };
    }
  }
}
