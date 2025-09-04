import { GoogleGenerativeAI } from '@google/generative-ai';

import { ChatMessage, UserContext } from '@/core/contextManager';
// Fallback stub until ai/utils are available
const parseJsonFromMarkdown = (raw: string): any => {
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
  } catch {}
  return {};
};
import {
  buildSystemInstruction,
  buildUserPrompt,
  decideExecution,
  normalizeModelAnalysis,
} from '@/core/intentUtils.fallback';
import { EnhancedPrompt, IntentAnalysis } from '@/core/types/intent';

export class IntentAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  public async analyzeIntent(
    message: string,
    contextInfo: any,
  ): Promise<IntentAnalysis> {
    const systemInstruction = buildSystemInstruction();
    const userPrompt = buildUserPrompt(message, contextInfo);
    const fullPrompt = `SYSTEM:\n${systemInstruction}\n\nUSER:\n${userPrompt}`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const raw = result.response.text();

      const parsed = parseJsonFromMarkdown(raw);
      const normalized = normalizeModelAnalysis(parsed);
      const decision = decideExecution(normalized);

      const out: IntentAnalysis = {
        type: normalized.type,
        confidence: normalized.confidence,
        description: normalized.description,
        isVague: normalized.is_vague,
        clarification: undefined,
        targets: normalized.targets,
        actions: normalized.actions,
        required_fields: normalized.required_fields,
        blocking_reasons: normalized.blocking_reasons,
        routing_key: normalized.routing_key,
        status: decision.status,
        reason: decision.reason,
        missing: decision.missing,
        enhancedMessage: normalized.enhanced_message,
      } as any;

      return out;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('analyzeIntent failed:', msg.slice(0, 300));
      return {
        type: 'general',
        confidence: 0.5,
        description: '의도 분석 실패, 기본값',
        isVague: true,
        status: 'manual',
        reason: 'parse_or_model_error',
      } as any;
    }
  }

  public async enhance(
    message: string,
    userContext: UserContext,
    recentMessages?: ChatMessage[],
  ): Promise<EnhancedPrompt> {
    const startTime = Date.now();
    const contextInfo = this.buildContextInfo(userContext, recentMessages);
    const intentAnalysis = await this.analyzeIntent(message, contextInfo);

    const processingTime = Date.now() - startTime;

    return {
      originalMessage: message,
      enhancedMessage: intentAnalysis.enhancedMessage || message,
      intent: {
        type: intentAnalysis.type as string,
        confidence: intentAnalysis.confidence,
        description: intentAnalysis.description,
        isVague: intentAnalysis.isVague,
        clarification: intentAnalysis.clarification,
      },
      target: {
        type: (intentAnalysis as any).targets?.[0]?.scope || 'unknown',
        id: (intentAnalysis as any).targets?.[0]?.id,
        name: (intentAnalysis as any).targets?.[0]?.name,
        description: (intentAnalysis as any).targets?.[0]?.description,
      },
      action: {
        type: (intentAnalysis as any).actions?.[0]?.type || 'explain',
        parameters: (intentAnalysis as any).actions?.[0]?.parameters || {},
        description:
          (intentAnalysis as any).actions?.[0]?.description || '기본 액션',
      },
      context: {
        projectContext: (contextInfo as any).projectContext,
        componentContext: (contextInfo as any).componentContext,
        conversationContext: (contextInfo as any).conversationContext,
      },
      metadata: {
        model: 'gemini-2.5-flash',
        tokens: 0,
        processingTime,
        timestamp: new Date(),
      },
    };
  }

  private buildContextInfo(
    userContext: UserContext,
    recentMessages?: ChatMessage[],
  ) {
    const contextInfo: any = {};

    if (userContext.currentProject) {
      contextInfo.projectContext = `현재 작업 중인 프로젝트: ${userContext.currentProject.name}${userContext.currentProject.description ? ` (${userContext.currentProject.description})` : ''}`;
    }

    if (userContext.currentComponent) {
      contextInfo.componentContext = `현재 작업 중인 컴포넌트: ${userContext.currentComponent.displayName} (${userContext.currentComponent.type})`;
    }

    if (recentMessages && recentMessages.length > 0) {
      const recentTexts = recentMessages
        .slice(-3)
        .map((msg) => `${msg.role}: ${msg.content.message}`)
        .join('\n');
      contextInfo.conversationContext = `최근 대화:\n${recentTexts}`;
    }

    return contextInfo;
  }
}

export const intentAnalyzer = new IntentAnalyzer(
  process.env.GEMINI_API_KEY || '',
);
