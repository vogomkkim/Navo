import { FastifyInstance } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WorkflowService } from '@/modules/workflow/workflow.service';
import { ProjectsService } from '@/modules/projects/projects.service';
import { normalizeModelAnalysis } from '../intentUtils.fallback';

interface AnalysisResult {
  intent: string | string[];
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
    this.app.log.info(`[Or-chestrator] Analyzing prompt: "${prompt}" with history.`);
    const analysis = await this.analyzeIntent(prompt, chatHistory);
    this.app.log.info({ analysis }, '[Orchestrator] Intent analysis complete');

    const intents = Array.isArray(analysis.intent) ? analysis.intent : [analysis.intent];

    if (intents.includes('project_modification') || intents.includes('create_project')) {
      const primaryIntent = intents.includes('project_modification') ? 'project_modification' : 'create_project';
      this.app.log.info(`[Orchestrator] Routing primary intent '${primaryIntent}' to Workflow Engine for planning and execution.`);

      const plan = await this.workflowService.preparePlan(prompt, user, chatHistory, projectId);
      const executionResult = await this.workflowService.executePlan(plan, user, projectId);

      return {
        type: 'WORKFLOW_RESULT',
        payload: {
          ...executionResult,
          summaryMessage: '요청하신 작업이 완료되었습니다. 파일 트리와 미리보기를 확인해주세요.',
        },
      };
    } else {
      this.app.log.info('[Orchestrator] Routing to Lightweight Responder for simple chat.');
      const simpleResponse = await this.generateSimpleResponse(prompt, chatHistory);
      return {
        type: 'SIMPLE_CHAT',
        payload: simpleResponse,
      };
    }
  }

  private async analyzeIntent(prompt: string, chatHistory: any[]): Promise<AnalysisResult> {
    const analysisPrompt = `
      Analyze the user's latest prompt to determine the primary intent(s), using the provided conversation history for context.

      **Conversation History:**
      ${JSON.stringify(chatHistory, null, 2)}

      **Latest User Prompt:**
      "${prompt}"

      **Analysis Categories:**
      - **intent**: Choose one or more from:
        - 'simple_chat' (greetings, simple questions, off-topic conversation)
        - 'project_modification' (ANY request to add, create, update, delete, or move files/directories within the project)
        - 'create_project' (requests to build or generate a new project from an idea)
        - 'unknown' (if none of the above apply)

      **Guiding Principles:**
      - Almost ALL user requests that reference files or directories (e.g., "/src/components", "my-button.tsx") are 'project_modification'.
      - Only classify as 'create_project' if the user is clearly starting from scratch.
      - If the request is clearly not 'simple_chat' but you are unsure between 'create_project' and 'project_modification', default to 'project_modification'.
      - If multiple intents are present in a single prompt (e.g., greeting + project request), return them all in an array.
      - Always be conservative: if truly uncertain, include 'unknown'.

      **Examples:**
      - Prompt: "안녕"
        intent: ["simple_chat"]

      - Prompt: "src/components/Button.tsx 파일에 클릭 핸들러 추가해 줘"
        intent: ["project_modification"]

      - Prompt: "새로운 블로그 프로젝트를 Next.js로 만들어 줘"
        intent: ["create_project"]

      - Prompt: "무슨 말인지 모르겠어"
        intent: ["unknown"]

      - Prompt: "안녕, 그리고 my-button.tsx도 수정해줘"
        intent: ["simple_chat", "project_modification"]

      **Output Format:**
      Return only a JSON object with the field "intent", which must be an array of one or more categories. For example:
      {
        "intent": ["project_modification"]
      }
    `;
    const result = await this.model.generateContent(analysisPrompt);
    const raw = result.response.text();
    const parsed = parseJsonFromMarkdown(raw);
    const normalized = normalizeModelAnalysis(parsed);
    return normalized;
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
}
