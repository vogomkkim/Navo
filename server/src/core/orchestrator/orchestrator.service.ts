import { FastifyInstance } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WorkflowService } from '@/modules/workflow/workflow.service';
import { logger } from '@/lib/logger';

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

  constructor(app: FastifyInstance) {
    this.app = app;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.workflowService = new WorkflowService(app);
  }

  async handleRequest(prompt: string, user: { id: string }, chatHistory: any[]): Promise<any> {
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
}
