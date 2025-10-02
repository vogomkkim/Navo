/**
 * 한국어 메시지 (기본 언어)
 */
export const ko = {
  // Workflow messages
  workflow: {
    planCreated: '계획이 생성되었습니다.',
    executionStarted: '워크플로우 실행을 시작합니다.',
    executionComplete: '워크플로우가 성공적으로 완료되었습니다.',
    proposalGenerated: '제안이 생성되었습니다. 검토 후 승인해주세요.',
    clarificationNeeded: '추가 정보가 필요합니다.',
  },

  // Proposal messages
  proposal: {
    title: '💡 AI 제안',
    description: 'AI가 다음과 같은 계획을 제안했습니다:',
    reasoning: '제안 이유',
    steps: '실행 단계',
    estimatedDuration: '예상 소요 시간',
    approve: '승인',
    reject: '거부',
    approving: '승인 중...',
    rejecting: '거부 중...',
    confidence: '신뢰도',
  },

  // Error messages
  error: {
    workflowFailed: '워크플로우 실행 중 오류가 발생했습니다.',
    planGenerationFailed: '계획 생성에 실패했습니다.',
    proposalNotFound: '제안을 찾을 수 없습니다.',
    unauthorized: '권한이 없습니다.',
    networkError: '네트워크 오류가 발생했습니다.',
    unexpectedError: '예상치 못한 오류가 발생했습니다.',
    retryAvailable: '다시 시도할 수 있습니다.',
  },

  // Step status messages
  stepStatus: {
    pending: '대기 중',
    running: '실행 중',
    completed: '완료',
    failed: '실패',
    skipped: '건너뜀',
  },

  // AI reasoning templates
  reasoning: {
    highConfidence: '요청이 명확하고 구체적이어서 즉시 실행할 수 있습니다.',
    mediumConfidence: '요청을 이해했지만 몇 가지 가정이 필요합니다.',
    lowConfidence: '요청이 모호하거나 복잡하여 사용자 확인이 필요합니다.',
    complexPlan: '계획이 복잡하여 승인 후 실행하는 것이 안전합니다.',
    destructiveAction: '중요한 변경사항이 포함되어 승인이 필요합니다.',
  },

  // Time units
  time: {
    seconds: '초',
    minutes: '분',
    hours: '시간',
    days: '일',
  },

  // Common actions
  actions: {
    retry: '다시 시도',
    cancel: '취소',
    confirm: '확인',
    close: '닫기',
  },

  // Chat interface
  chat: {
    placeholder: '메시지를 입력하세요...',
    loading: '대화 내역을 불러오는 중...',
    emptyState: '새로운 대화를 시작하세요',
    sendError: '메시지 전송 실패',
    errorPrefix: '오류',
  },
};

export type TranslationKeys = typeof ko;
