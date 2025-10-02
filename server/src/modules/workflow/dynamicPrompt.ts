/**
 * @file Dynamic Prompt System
 * 맥락과 히스토리에 따라 프롬프트를 동적으로 조정
 */

import { ConversationMemory, ConversationMemoryService } from './conversationMemory';

export interface DynamicPromptContext {
  userHistory: ConversationMemory[];
  userPatterns: {
    commonIntents: string[];
    preferredFileTypes: string[];
    successRate: number;
  };
  currentContext: {
    activeView?: string;
    activeFile?: string;
    activePreviewRoute?: string;
  };
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  conversationLength: number;
}

export class DynamicPromptService {
  private memoryService: ConversationMemoryService;

  constructor() {
    this.memoryService = new ConversationMemoryService();
  }

  /**
   * 맥락에 맞는 프롬프트 생성
   */
  async generateContextualPrompt(
    basePrompt: string,
    userId: string,
    projectId: string,
    currentMessage: string,
    context: any
  ): Promise<string> {
    // 사용자 히스토리 분석
    const userHistory = await this.memoryService.findSimilarConversations(
      userId, projectId, currentMessage, 3
    );

    const userPatterns = this.memoryService.analyzeUserPatterns(userId, projectId);

    const promptContext: DynamicPromptContext = {
      userHistory,
      userPatterns,
      currentContext: context,
      timeOfDay: this.getTimeOfDay(),
      conversationLength: userHistory.length
    };

    return this.buildDynamicPrompt(basePrompt, promptContext);
  }

  /**
   * 동적 프롬프트 구성
   */
  private buildDynamicPrompt(
    basePrompt: string,
    context: DynamicPromptContext
  ): string {
    let dynamicPrompt = basePrompt;

    // 사용자 패턴 기반 조정
    if (context.userPatterns.commonIntents.length > 0) {
      const commonIntents = context.userPatterns.commonIntents.join(', ');
      dynamicPrompt += `\n\n**USER PATTERNS:**\n이 사용자는 주로 "${commonIntents}" 관련 요청을 합니다.`;
    }

    // 성공률 기반 조정
    if (context.userPatterns.successRate < 0.7) {
      dynamicPrompt += `\n\n**ATTENTION:** 이 사용자의 요청 성공률이 낮습니다 (${Math.round(context.userPatterns.successRate * 100)}%). 더 신중하게 계획을 세우세요.`;
    }

    // 대화 길이 기반 조정
    if (context.conversationLength > 10) {
      dynamicPrompt += `\n\n**CONVERSATION CONTEXT:** 이 사용자와 ${context.conversationLength}번의 대화를 나눴습니다. 이전 대화를 참고하여 더 정확한 응답을 제공하세요.`;
    }

    // 시간대 기반 조정
    if (context.timeOfDay === 'night') {
      dynamicPrompt += `\n\n**TIME CONTEXT:** 현재 밤 시간입니다. 사용자가 피곤할 수 있으니 간단하고 명확한 응답을 제공하세요.`;
    }

    // 유사한 이전 대화 참조
    if (context.userHistory.length > 0) {
      dynamicPrompt += `\n\n**SIMILAR PREVIOUS CONVERSATIONS:**\n`;
      context.userHistory.forEach((memory, index) => {
        dynamicPrompt += `${index + 1}. 사용자: "${memory.userMessage}"\n   AI: "${memory.aiResponse}"\n`;
      });
      dynamicPrompt += `\n위 대화들을 참고하여 더 나은 응답을 제공하세요.`;
    }

    // 현재 컨텍스트 강화
    if (context.currentContext.activeFile) {
      dynamicPrompt += `\n\n**CURRENT WORKING CONTEXT:**\n사용자가 현재 "${context.currentContext.activeFile}" 파일을 작업 중입니다. 이 맥락을 고려하여 응답하세요.`;
    }

    return dynamicPrompt;
  }

  /**
   * 현재 시간대 계산
   */
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * 질문 답변용 동적 프롬프트
   */
  async generateQuestionPrompt(
    userId: string,
    projectId: string,
    question: string,
    context: any
  ): Promise<string> {
    const userHistory = await this.memoryService.findSimilarConversations(
      userId, projectId, question, 2
    );

    let prompt = `You are a helpful assistant that answers questions about the current state of the Navo project.

**CURRENT CONTEXT:**
- Active View: ${context.activeView || "unknown"}
- Active File: ${context.activeFile || "none"}
- Active Preview Route: ${context.activePreviewRoute || "none"}
- Project ID: ${context.projectId || "N/A"}

**USER QUESTION:** "${question}"`;

    // 이전 유사 질문 참조
    if (userHistory.length > 0) {
      prompt += `\n\n**SIMILAR PREVIOUS QUESTIONS:**\n`;
      userHistory.forEach((memory, index) => {
        prompt += `${index + 1}. Q: "${memory.userMessage}"\n   A: "${memory.aiResponse}"\n`;
      });
      prompt += `\n위 질문들을 참고하여 일관성 있는 답변을 제공하세요.`;
    }

    prompt += `\n\n**INSTRUCTIONS:**
1. Answer the user's question based on the current context information provided above.
2. Be concise and helpful.
3. If the question is about the current screen/page/file, use the context information to provide accurate details.
4. If you don't have enough information to answer, say so clearly.

**RESPONSE FORMAT:**
You MUST respond with ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or additional text.

Format:
{
  "answer": "Your answer here",
  "context_used": "Which context information you used"
}`;

    return prompt;
  }

  /**
   * 워크플로우 계획용 동적 프롬프트
   */
  async generateWorkflowPrompt(
    userId: string,
    projectId: string,
    request: string,
    context: any,
    availableTools: string
  ): Promise<string> {
    const userHistory = await this.memoryService.findSimilarConversations(
      userId, projectId, request, 3
    );

    const userPatterns = this.memoryService.analyzeUserPatterns(userId, projectId);

    let prompt = `You are an AI Project Planner. Generate a JSON object that represents a valid 'Plan'.

**USER REQUEST:** "${request}"

**CURRENT CONTEXT:**
- Active View: ${context.activeView || "unknown"}
- Active File: ${context.activeFile || "none"}
- Active Preview Route: ${context.activePreviewRoute || "none"}
- Project ID: ${context.projectId || "N/A"}

**AVAILABLE TOOLS:**
${availableTools}`;

    // 사용자 패턴 반영
    if (userPatterns.commonIntents.length > 0) {
      prompt += `\n\n**USER PREFERENCES:**\n이 사용자는 주로 "${userPatterns.commonIntents.join(', ')}" 관련 작업을 선호합니다.`;
    }

    // 이전 유사 요청 참조
    if (userHistory.length > 0) {
      prompt += `\n\n**SIMILAR PREVIOUS REQUESTS:**\n`;
      userHistory.forEach((memory, index) => {
        prompt += `${index + 1}. 요청: "${memory.userMessage}"\n   결과: "${memory.aiResponse}"\n`;
      });
      prompt += `\n위 요청들을 참고하여 더 나은 계획을 세우세요.`;
    }

    prompt += `\n\n**CRITICAL RULES:**
1. **LANGUAGE:** All user-facing messages (reasoning, plan names, descriptions) must be in KOREAN (한국어).
2. **VALID JSON ONLY:** Respond with ONLY a valid JSON object. No markdown, no code blocks, no additional text.
3. **CORRECT JSON STRUCTURE - PlannerOutput format:** Use this exact format:
{
  "decision": "execute",
  "confidence": 0.9,
  "reasoning": "요청이 명확하고 구체적이어서 즉시 실행할 수 있습니다.",
  "plan": {
    "name": "TODO 앱 생성",
    "description": "간단한 TODO 앱을 HTML, CSS, JavaScript로 구현합니다.",
    "steps": [
      {
        "id": "step_1",
        "title": "프로젝트 아키텍처 생성",
        "description": "TODO 앱의 기본 구조를 설정합니다.",
        "tool": "tool_name",
        "inputs": {...},
        "dependencies": []
      }
    ],
    "estimatedDuration": 60,
    "parallelizable": false
  }
}

**DECISION FIELD:**
- Use "execute" if the user's request is clear, specific, and you have high confidence (>0.7)
- Use "propose" if the request is vague, complex, or you need user confirmation (confidence <0.7)

**CONFIDENCE FIELD:**
- A number between 0 and 1 representing your confidence in understanding and fulfilling the request
- 0.9-1.0: Very clear, straightforward request
- 0.7-0.9: Clear request with some ambiguity
- 0.5-0.7: Vague or complex request, recommend proposal
- 0.0-0.5: Very unclear, definitely propose for approval

**REASONING FIELD:**
- Explain your decision (execute vs propose) and confidence score IN KOREAN
- This will be shown directly to users, so write in clear, natural Korean
- Mention any assumptions or clarifications needed
- Example: "요청이 명확하고 구체적이어서 즉시 실행할 수 있습니다."

4. **COMPLETE PLAN:** Include all necessary steps to fulfill the user's request. All plan fields (name, description, titles) must be in KOREAN.
5. **CORRECT TOOL USAGE:** Use only the tools listed in AVAILABLE TOOLS.
6. **NO CIRCULAR DEPENDENCIES:** NEVER create circular dependencies. Each step can only depend on steps that come BEFORE it in the execution order.
7. **Execution Order:** Plan your steps in a logical, linear order. Database creation → Architecture design → File generation → Implementation.
8. **Fallback Strategy:** If you cannot understand the user's request or find appropriate tools, create a simple plan with basic tools like \`create_vfs_file\` or \`create_vfs_directory\` rather than failing.`;

    return prompt;
  }
}
