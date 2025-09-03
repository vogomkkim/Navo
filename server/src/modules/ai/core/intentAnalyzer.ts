/*
 * Intent Analyzer – Unified intent analysis and message enhancement
 * - Single LLM call for unified analysis
 * - Enhanced message generation capability
 * - Robust execution policy
 * - Clean architecture with separated types and utilities
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { UserContext, ChatMessage } from './contextManager';
import { parseJsonFromMarkdown } from '../utils/jsonExtractor';
import { IntentAnalysis, EnhancedPrompt, ContextInfo } from './types/intent';

import {
  normalizeModelAnalysis,
  decideExecution,
  buildSystemInstruction,
  buildUserPrompt,
} from '../utils/intentUtils';

/**
 * IntentAnalyzer 클래스
 * 통합된 의도 분석 및 메시지 향상 기능 제공
 */
export class IntentAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
  }

  /**
   * 통합된 의도 분석 (실행 정책 포함)
   */
  public async analyzeIntent(
    message: string,
    contextInfo: ContextInfo
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
        clarification: undefined, // 자동 재질의 제거
        targets: normalized.targets,
        actions: normalized.actions,
        required_fields: normalized.required_fields,
        blocking_reasons: normalized.blocking_reasons,
        routing_key: normalized.routing_key,
        status: decision.status,
        reason: decision.reason,
        missing: decision.missing,
        enhancedMessage: normalized.enhanced_message,
      };

      return out;
    } catch (error) {
      // 최소한의 노이즈 로깅(민감 정보 노출 방지)
      const msg = error instanceof Error ? error.message : String(error);
      console.error('analyzeIntent failed:', msg.slice(0, 300));
      return {
        type: 'general',
        confidence: 0.5,
        description: '의도 분석 실패, 기본값',
        isVague: true,
        status: 'manual',
        reason: 'parse_or_model_error',
      };
    }
  }

  /**
   * EnhancedPrompt 형태로 반환
   */
  public async enhance(
    message: string,
    userContext: UserContext,
    recentMessages?: ChatMessage[]
  ): Promise<EnhancedPrompt> {
    const startTime = Date.now();
    const contextInfo = this.buildContextInfo(userContext, recentMessages);
    const intentAnalysis = await this.analyzeIntent(message, contextInfo);

    const processingTime = Date.now() - startTime;

    return {
      originalMessage: message,
      enhancedMessage: intentAnalysis.enhancedMessage || message,
      intent: {
        type: intentAnalysis.type,
        confidence: intentAnalysis.confidence,
        description: intentAnalysis.description,
        isVague: intentAnalysis.isVague,
        clarification: intentAnalysis.clarification,
      },
      target: {
        type: intentAnalysis.targets?.[0]?.scope || 'unknown',
        id: intentAnalysis.targets?.[0]?.id,
        name: intentAnalysis.targets?.[0]?.name,
        description: intentAnalysis.targets?.[0]?.description,
      },
      action: {
        type: intentAnalysis.actions?.[0]?.type || 'explain',
        parameters: intentAnalysis.actions?.[0]?.parameters || {},
        description: intentAnalysis.actions?.[0]?.description || '기본 액션',
      },
      context: {
        projectContext: contextInfo.projectContext,
        componentContext: contextInfo.componentContext,
        conversationContext: contextInfo.conversationContext,
      },
      metadata: {
        model: 'gemini-2.5-flash',
        tokens: 0, // TODO: 실제 토큰 수 계산
        processingTime,
        timestamp: new Date(),
      },
    };
  }

  /**
   * 컨텍스트 정보 구성
   */
  private buildContextInfo(
    userContext: UserContext,
    recentMessages?: ChatMessage[]
  ): ContextInfo {
    const contextInfo: ContextInfo = {};

    // 프로젝트 컨텍스트
    if (userContext.currentProject) {
      contextInfo.projectContext = `현재 작업 중인 프로젝트: ${userContext.currentProject.name}${
        userContext.currentProject.description
          ? ` (${userContext.currentProject.description})`
          : ''
      }`;
    }

    // 컴포넌트 컨텍스트
    if (userContext.currentComponent) {
      contextInfo.componentContext = `현재 작업 중인 컴포넌트: ${userContext.currentComponent.displayName} (${userContext.currentComponent.type})`;
    }

    // 대화 컨텍스트
    if (recentMessages && recentMessages.length > 0) {
      const recentTexts = recentMessages
        .slice(-3) // 최근 3개 메시지만
        .map((msg) => `${msg.role}: ${msg.content.message}`)
        .join('\n');
      contextInfo.conversationContext = `최근 대화:\n${recentTexts}`;
    }

    return contextInfo;
  }
}

// 싱글톤 인스턴스
export const intentAnalyzer = new IntentAnalyzer(
  process.env.GEMINI_API_KEY || ''
);
