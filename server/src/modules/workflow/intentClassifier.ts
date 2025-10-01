/**
 * @file Intent classification for user input
 */

export type IntentType = 'QUESTION' | 'REQUEST' | 'COMMAND' | 'UNKNOWN';

export interface IntentClassification {
  type: IntentType;
  confidence: number;
  reasoning: string;
}

export class IntentClassifier {
  private questionPatterns = [
    '뭐야', '무엇', '어디', '언제', '어떻게', '현재', '지금',
    '이름', '상태', '정보', '알려', '보여', '확인'
  ];

  private requestPatterns = [
    '만들어', '생성', '추가', '수정', '삭제', '변경', '개선',
    '구현', '개발', '작성', '코딩', '프로그래밍'
  ];

  private commandPatterns = [
    '실행', '시작', '중지', '재시작', '리셋', '초기화'
  ];

  /**
   * Classify user intent based on prompt and context
   */
  async classifyIntent(prompt: string, context?: any): Promise<IntentClassification> {
    const lowerPrompt = prompt.toLowerCase();

    // Check for question patterns
    const questionMatches = this.questionPatterns.filter(pattern =>
      lowerPrompt.includes(pattern.toLowerCase())
    );

    // Check for request patterns
    const requestMatches = this.requestPatterns.filter(pattern =>
      lowerPrompt.includes(pattern.toLowerCase())
    );

    // Check for command patterns
    const commandMatches = this.commandPatterns.filter(pattern =>
      lowerPrompt.includes(pattern.toLowerCase())
    );

    // Determine intent based on matches
    if (questionMatches.length > 0 && requestMatches.length === 0) {
      return {
        type: 'QUESTION',
        confidence: Math.min(0.9, 0.5 + (questionMatches.length * 0.1)),
        reasoning: `Question patterns detected: ${questionMatches.join(', ')}`
      };
    }

    if (requestMatches.length > 0) {
      return {
        type: 'REQUEST',
        confidence: Math.min(0.9, 0.6 + (requestMatches.length * 0.1)),
        reasoning: `Request patterns detected: ${requestMatches.join(', ')}`
      };
    }

    if (commandMatches.length > 0) {
      return {
        type: 'COMMAND',
        confidence: Math.min(0.9, 0.7 + (commandMatches.length * 0.1)),
        reasoning: `Command patterns detected: ${commandMatches.join(', ')}`
      };
    }

    // Default to REQUEST if unclear (maintains existing behavior)
    return {
      type: 'REQUEST',
      confidence: 0.3,
      reasoning: 'No clear patterns detected, defaulting to REQUEST'
    };
  }

  /**
   * Check if prompt is asking for information about current state
   */
  isStateInquiry(prompt: string): boolean {
    const stateKeywords = ['현재', '지금', '화면', '페이지', '파일', '상태', '이름'];
    const lowerPrompt = prompt.toLowerCase();

    return stateKeywords.some(keyword => lowerPrompt.includes(keyword));
  }
}
