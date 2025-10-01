/**
 * @file Meta Cognition System
 * AI가 자신의 응답을 성찰하고 개선하는 시스템
 */

export interface SelfReflection {
  id: string;
  userId: string;
  projectId: string;
  originalRequest: string;
  aiResponse: string;
  reflection: {
    confidence: number; // 0-1
    reasoning: string;
    potentialIssues: string[];
    alternativeApproaches: string[];
    userSatisfactionPrediction: 'positive' | 'negative' | 'neutral';
  };
  timestamp: Date;
}

export class MetaCognitionService {
  private reflections: Map<string, SelfReflection[]> = new Map();

  /**
   * AI 응답에 대한 자기 성찰 수행
   */
  async reflectOnResponse(
    userId: string,
    projectId: string,
    request: string,
    response: string,
    context: any
  ): Promise<SelfReflection> {
    const reflection: SelfReflection = {
      id: `reflection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      projectId,
      originalRequest: request,
      aiResponse: response,
      reflection: {
        confidence: this.calculateConfidence(request, response),
        reasoning: this.generateReasoning(request, response, context),
        potentialIssues: this.identifyPotentialIssues(request, response),
        alternativeApproaches: this.generateAlternatives(request, response),
        userSatisfactionPrediction: this.predictUserSatisfaction(request, response)
      },
      timestamp: new Date()
    };

    // 메타 인지 저장
    const key = `${userId}_${projectId}`;
    if (!this.reflections.has(key)) {
      this.reflections.set(key, []);
    }
    this.reflections.get(key)!.push(reflection);

    return reflection;
  }

  /**
   * 응답에 대한 신뢰도 계산
   */
  private calculateConfidence(request: string, response: string): number {
    let confidence = 0.5; // 기본값

    // 질문 유형별 신뢰도 조정
    if (request.includes('뭐야') || request.includes('무엇')) {
      confidence += 0.2; // 정보 질문은 높은 신뢰도
    }

    if (request.includes('만들어') || request.includes('생성')) {
      confidence += 0.1; // 생성 요청은 중간 신뢰도
    }

    // 응답 길이 기반 조정
    if (response.length < 10) {
      confidence -= 0.3; // 너무 짧은 응답은 신뢰도 낮음
    }

    if (response.length > 200) {
      confidence += 0.1; // 충분한 설명은 신뢰도 높음
    }

    // 에러 메시지 포함 시 신뢰도 낮음
    if (response.includes('죄송') || response.includes('실패') || response.includes('오류')) {
      confidence -= 0.4;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 응답에 대한 추론 과정 생성
   */
  private generateReasoning(request: string, response: string, context: any): string {
    const reasoning = [];

    // 요청 분석
    if (request.includes('뭐야')) {
      reasoning.push('사용자가 현재 상태에 대한 정보를 요청했습니다.');
    }

    if (request.includes('만들어')) {
      reasoning.push('사용자가 새로운 것을 생성하길 원합니다.');
    }

    // 컨텍스트 활용
    if (context.activeFile) {
      reasoning.push(`현재 작업 중인 파일 "${context.activeFile}"을 고려했습니다.`);
    }

    if (context.activeView === 'preview') {
      reasoning.push('사용자가 미리보기 모드에서 작업 중입니다.');
    }

    // 응답 품질 평가
    if (response.includes('현재')) {
      reasoning.push('현재 상태 정보를 제공했습니다.');
    }

    if (response.includes('파일')) {
      reasoning.push('파일 관련 정보를 포함했습니다.');
    }

    return reasoning.join(' ');
  }

  /**
   * 잠재적 문제점 식별
   */
  private identifyPotentialIssues(request: string, response: string): string[] {
    const issues = [];

    // 불완전한 정보 제공
    if (response.includes('알 수 없') || response.includes('확인할 수 없')) {
      issues.push('불완전한 정보를 제공했습니다.');
    }

    // 모호한 응답
    if (response.includes('아마도') || response.includes('추정')) {
      issues.push('불확실한 표현을 사용했습니다.');
    }

    // 기술적 용어 사용
    if (response.includes('UUID') || response.includes('dependency') || response.includes('circular')) {
      issues.push('사용자에게 친화적이지 않은 기술적 용어를 사용했습니다.');
    }

    // 너무 짧은 응답
    if (response.length < 20) {
      issues.push('응답이 너무 간결합니다.');
    }

    return issues;
  }

  /**
   * 대안적 접근법 제안
   */
  private generateAlternatives(request: string, response: string): string[] {
    const alternatives = [];

    // 더 구체적인 정보 제공
    if (request.includes('뭐야') && response.length < 50) {
      alternatives.push('더 자세한 설명을 제공할 수 있습니다.');
    }

    // 예시 추가
    if (request.includes('어떻게') && !response.includes('예시')) {
      alternatives.push('구체적인 예시를 포함할 수 있습니다.');
    }

    // 단계별 안내
    if (request.includes('만들어') && !response.includes('단계')) {
      alternatives.push('단계별 가이드를 제공할 수 있습니다.');
    }

    return alternatives;
  }

  /**
   * 사용자 만족도 예측
   */
  private predictUserSatisfaction(request: string, response: string): 'positive' | 'negative' | 'neutral' {
    let score = 0;

    // 긍정적 요소
    if (response.includes('완료') || response.includes('성공')) score += 2;
    if (response.includes('도움') || response.includes('도와')) score += 1;
    if (response.length > 50) score += 1;

    // 부정적 요소
    if (response.includes('죄송') || response.includes('실패')) score -= 2;
    if (response.includes('알 수 없') || response.includes('확인할 수 없')) score -= 1;
    if (response.length < 20) score -= 1;

    if (score >= 2) return 'positive';
    if (score <= -2) return 'negative';
    return 'neutral';
  }

  /**
   * 사용자별 메타 인지 패턴 분석
   */
  analyzeMetaPatterns(userId: string, projectId: string): {
    averageConfidence: number;
    commonIssues: string[];
    satisfactionAccuracy: number;
    improvementSuggestions: string[];
  } {
    const key = `${userId}_${projectId}`;
    const reflections = this.reflections.get(key) || [];

    if (reflections.length === 0) {
      return {
        averageConfidence: 0.5,
        commonIssues: [],
        satisfactionAccuracy: 0,
        improvementSuggestions: []
      };
    }

    const averageConfidence = reflections.reduce((sum, r) => sum + r.reflection.confidence, 0) / reflections.length;

    const allIssues = reflections.flatMap(r => r.reflection.potentialIssues);
    const commonIssues = this.getMostCommon(allIssues);

    return {
      averageConfidence,
      commonIssues,
      satisfactionAccuracy: 0.7, // TODO: 실제 정확도 계산
      improvementSuggestions: this.generateImprovementSuggestions(commonIssues)
    };
  }

  /**
   * 가장 빈번한 항목 찾기
   */
  private getMostCommon(items: string[]): string[] {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([item]) => item);
  }

  /**
   * 개선 제안 생성
   */
  private generateImprovementSuggestions(commonIssues: string[]): string[] {
    const suggestions = [];

    if (commonIssues.some(issue => issue.includes('불완전'))) {
      suggestions.push('더 완전한 정보를 제공하도록 개선하세요.');
    }

    if (commonIssues.some(issue => issue.includes('모호'))) {
      suggestions.push('더 명확하고 구체적인 표현을 사용하세요.');
    }

    if (commonIssues.some(issue => issue.includes('기술적'))) {
      suggestions.push('사용자 친화적인 언어로 설명하세요.');
    }

    return suggestions;
  }
}
