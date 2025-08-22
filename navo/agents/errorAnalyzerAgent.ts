/**
 * Error Analyzer Agent
 *
 * AI를 사용하여 에러를 분석하고 해결 방법을 제시하는 에이전트
 */

import {
  BaseAgent,
  ErrorResolutionAgent,
  ErrorContext,
  ResolutionResult,
  ErrorType,
  ErrorSeverity,
  ErrorAnalysis,
} from '../core/errorResolution.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class ErrorAnalyzerAgent extends BaseAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    super('ErrorAnalyzerAgent', 1); // 최고 우선순위

    // Gemini API 초기화
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * 이 에이전트가 처리할 수 있는 에러인지 확인
   * ErrorAnalyzerAgent는 모든 에러를 분석할 수 있음
   */
  canHandle(error: Error): boolean {
    return true; // 모든 에러를 분석할 수 있음
  }

  /**
   * 에러 분석 및 해결 방법 제시
   */
  async execute(
    error: Error,
    context: ErrorContext
  ): Promise<ResolutionResult> {
    try {
      this.logSuccess(context, '에러 분석 시작', { error: error.message });

      // AI를 사용한 에러 분석
      const analysis = await this.analyzeErrorWithAI(error, context);

      // 분석 결과를 바탕으로 해결 방법 제시
      const solution = this.generateSolutionFromAnalysis(analysis);

      this.logSuccess(context, '에러 분석 완료', {
        errorType: analysis.errorType,
        severity: analysis.severity,
        solution: solution.description,
      });

      return {
        success: true,
        changes: [], // 분석 단계에서는 실제 수정을 하지 않음
        executionTime: 0, // measureExecutionTime을 사용하지 않음
        nextSteps: [
          '분석 완료: AI가 제안한 해결 방법을 확인하세요',
          'CodeFixerAgent가 자동으로 코드를 수정할 수 있습니다',
          '수동 수정이 필요한 경우 상세한 가이드를 제공합니다',
        ],
      };
    } catch (e) {
      this.logError(error, context, '에러 분석 실패');

      return {
        success: false,
        changes: [],
        executionTime: 0,
        errorMessage: `에러 분석 실패: ${e instanceof Error ? e.message : String(e)}`,
        nextSteps: ['수동 디버깅이 필요합니다', '시스템 관리자에게 문의하세요'],
      };
    }
  }

  /**
   * AI를 사용하여 에러 분석
   */
  private async analyzeErrorWithAI(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorAnalysis> {
    const prompt = this.buildAnalysisPrompt(error, context);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // AI 응답 파싱
      const aiAnalysis = this.parseAIResponse(text);

      // 기본 에러 타입 및 심각도 추정 (AI 분석 실패 시 대체)
      const fallbackType = this.estimateErrorType(error);
      const fallbackSeverity = this.estimateErrorSeverity(error, context);

      return {
        errorType: aiAnalysis.errorType || fallbackType,
        rootCause: aiAnalysis.rootCause || this.estimateRootCause(error),
        severity: aiAnalysis.severity || fallbackSeverity,
        solution: aiAnalysis.solution || this.generateFallbackSolution(error),
        metadata: {
          aiAnalyzed: true,
          fallbackUsed: !aiAnalysis.errorType,
          originalError: error.message,
          context: context,
        },
      };
    } catch (aiError) {
      console.warn(
        `[ErrorAnalyzerAgent] AI 분석 실패, 대체 방법 사용:`,
        aiError
      );

      // AI 분석 실패 시 기본 분석 사용
      return {
        errorType: this.estimateErrorType(error),
        rootCause: this.estimateRootCause(error),
        severity: this.estimateErrorSeverity(error, context),
        solution: this.generateFallbackSolution(error),
        metadata: {
          aiAnalyzed: false,
          fallbackUsed: true,
          aiError: aiError instanceof Error ? aiError.message : String(aiError),
          originalError: error.message,
          context: context,
        },
      };
    }
  }

  /**
   * AI 분석을 위한 프롬프트 생성
   */
  private buildAnalysisPrompt(error: Error, context: ErrorContext): string {
    return `
당신은 JavaScript 에러 분석 전문가입니다. 다음 에러를 분석하고 구체적인 해결 방법을 제시해주세요.

## 에러 정보
- **메시지**: ${error.message}
- **파일**: ${(error as any).filename || 'unknown'}
- **라인**: ${(error as any).lineno || 'unknown'}
- **스택**: ${error.stack || 'unknown'}

## 컨텍스트 정보
- **URL**: ${context.url}
- **사용자 에이전트**: ${context.userAgent}
- **프로젝트 ID**: ${context.projectId || 'none'}
- **발생 시간**: ${context.timestamp.toISOString()}

## 응답 형식
다음 JSON 형식으로 응답해주세요 (한국어로):

{
  "errorType": "null_reference|element_not_found|dom_manipulation|network_error|api_response_error|authentication_error|type_error|undefined_error|validation_error|infinite_loop|memory_leak|timeout_error|unknown_error",
  "rootCause": "에러의 근본 원인을 간단명료하게 설명",
  "severity": "critical|high|medium|low",
  "solution": {
    "description": "해결 방법에 대한 간단한 설명",
    "codeChanges": [
      {
        "file": "수정할 파일 경로 (예: navo/web/app.js)",
        "action": "create|modify|delete|replace",
        "content": "새로운 코드 내용 (필요한 경우)",
        "reason": "이 수정이 필요한 이유"
      }
    ],
    "estimatedTime": "예상 소요 시간(초)",
    "autoRecoverable": true/false
  }
}

## 주의사항
- JSON 형식만 응답하고, 다른 설명은 포함하지 마세요
- 에러 타입과 심각도는 제공된 옵션 중에서 선택하세요
- 해결 방법은 구체적이고 실행 가능해야 합니다
- 코드 변경사항은 실제 파일 경로와 일치해야 합니다
`;
  }

  /**
   * AI 응답 파싱
   */
  private parseAIResponse(response: string): Partial<ErrorAnalysis> {
    try {
      // 마크다운 코드 블록 제거
      let cleanResponse = response;
      if (response.includes('```json')) {
        cleanResponse = response
          .replace(/```json\s*/, '')
          .replace(/\s*```$/, '');
      } else if (response.includes('```')) {
        cleanResponse = response.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanResponse);

      // 필수 필드 검증
      if (
        !parsed.errorType ||
        !parsed.rootCause ||
        !parsed.severity ||
        !parsed.solution
      ) {
        throw new Error('AI 응답에 필수 필드가 누락되었습니다');
      }

      return parsed;
    } catch (parseError) {
      console.error(`[ErrorAnalyzerAgent] AI 응답 파싱 실패:`, parseError);
      console.error(`[ErrorAnalyzerAgent] 원본 응답:`, response);
      throw new Error(
        `AI 응답 파싱 실패: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  }

  /**
   * 에러 타입 추정 (AI 분석 실패 시 대체)
   */
  private estimateErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('null') || message.includes('undefined')) {
      return ErrorType.NULL_REFERENCE;
    }

    if (
      message.includes('element') ||
      message.includes('dom') ||
      message.includes('getelementbyid')
    ) {
      return ErrorType.ELEMENT_NOT_FOUND;
    }

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('http')
    ) {
      return ErrorType.NETWORK_ERROR;
    }

    if (
      message.includes('type') ||
      message.includes('cannot read') ||
      message.includes('is not a function')
    ) {
      return ErrorType.TYPE_ERROR;
    }

    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR;
    }

    if (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return ErrorType.AUTHENTICATION_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * 에러 심각도 추정 (AI 분석 실패 시 대체)
   */
  private estimateErrorSeverity(
    error: Error,
    context: ErrorContext
  ): ErrorSeverity {
    const errorType = this.estimateErrorType(error);

    // DOM 관련 에러는 보통 중간 정도의 심각도
    if (
      [ErrorType.NULL_REFERENCE, ErrorType.ELEMENT_NOT_FOUND].includes(
        errorType
      )
    ) {
      return ErrorSeverity.MEDIUM;
    }

    // 네트워크 에러는 높은 심각도
    if (
      [ErrorType.NETWORK_ERROR, ErrorType.API_RESPONSE_ERROR].includes(
        errorType
      )
    ) {
      return ErrorSeverity.HIGH;
    }

    // 인증 에러는 높은 심각도
    if (errorType === ErrorType.AUTHENTICATION_ERROR) {
      return ErrorSeverity.HIGH;
    }

    // 타입 에러는 보통 낮은 심각도
    if (
      [ErrorType.TYPE_ERROR, ErrorType.VALIDATION_ERROR].includes(errorType)
    ) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * 근본 원인 추정 (AI 분석 실패 시 대체)
   */
  private estimateRootCause(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('null') || message.includes('undefined')) {
      return 'DOM 요소가 존재하지 않거나 초기화되지 않았습니다';
    }

    if (message.includes('element') || message.includes('dom')) {
      return '요청한 DOM 요소를 찾을 수 없습니다';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return '네트워크 연결 문제 또는 API 서버 오류가 발생했습니다';
    }

    if (message.includes('type') || message.includes('cannot read')) {
      return '변수나 객체의 타입이 예상과 다르거나 정의되지 않았습니다';
    }

    if (message.includes('timeout')) {
      return '요청이 시간 초과되었습니다';
    }

    if (message.includes('auth')) {
      return '인증 정보가 유효하지 않거나 만료되었습니다';
    }

    return '알 수 없는 오류가 발생했습니다';
  }

  /**
   * 대체 해결 방법 생성 (AI 분석 실패 시)
   */
  private generateFallbackSolution(error: Error): ErrorAnalysis['solution'] {
    const errorType = this.estimateErrorType(error);

    switch (errorType) {
      case ErrorType.NULL_REFERENCE:
        return {
          description:
            'DOM 요소 존재 여부를 확인하고 안전한 접근 방법을 사용합니다',
          codeChanges: [
            {
              file: 'navo/web/app.js',
              action: 'modify',
              content: '// null 체크 추가 예시',
              reason: 'DOM 요소 접근 전 null 체크가 필요합니다',
            },
          ],
          estimatedTime: 30,
          autoRecoverable: true,
        };

      case ErrorType.ELEMENT_NOT_FOUND:
        return {
          description:
            '요청한 DOM 요소를 찾을 수 없습니다. 요소 ID나 선택자를 확인하세요',
          codeChanges: [
            {
              file: 'navo/web/index.html',
              action: 'modify',
              content: '<!-- 누락된 요소 추가 -->',
              reason: 'HTML에 필요한 요소가 정의되지 않았습니다',
            },
          ],
          estimatedTime: 45,
          autoRecoverable: true,
        };

      case ErrorType.NETWORK_ERROR:
        return {
          description:
            '네트워크 연결을 확인하고 API 엔드포인트 상태를 점검하세요',
          codeChanges: [
            {
              file: 'navo/web/app.js',
              action: 'modify',
              content: '// 에러 처리 및 재시도 로직 추가',
              reason: '네트워크 오류에 대한 적절한 처리가 필요합니다',
            },
          ],
          estimatedTime: 60,
          autoRecoverable: false,
        };

      default:
        return {
          description:
            '일반적인 오류입니다. 콘솔 로그를 확인하고 수동으로 디버깅하세요',
          codeChanges: [],
          estimatedTime: 120,
          autoRecoverable: false,
        };
    }
  }

  /**
   * 분석 결과를 바탕으로 해결 방법 생성
   */
  private generateSolutionFromAnalysis(
    analysis: ErrorAnalysis
  ): ErrorAnalysis['solution'] {
    return analysis.solution;
  }
}
