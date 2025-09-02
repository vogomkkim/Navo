import { EnhancedPrompt } from './types/intent.js';
import { UserContext } from './contextManager.js';

/**
 * 액션 핸들러 인터페이스
 */
export interface ActionHandler {
  name: string;
  description: string;
  canHandle(intent: string, target: string): boolean;
  execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult>;
}

/**
 * 액션 실행 결과
 */
export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  nextAction?: string;
  error?: string;
}

/**
 * 라우팅 규칙 인터페이스
 */
export interface RoutingRule {
  intent: string;
  target?: string;
  action?: string;
  handler: string;
  priority: number;
  description: string;
}

/**
 * ActionRouter 클래스
 * 의도별 처리 분기 및 적절한 핸들러 선택
 */
export class ActionRouter {
  private handlers: Map<string, ActionHandler>;
  private routingRules: RoutingRule[];

  constructor() {
    this.handlers = new Map();
    this.routingRules = this.initializeRoutingRules();
  }

  /**
   * 핸들러 등록
   */
  registerHandler(name: string, handler: ActionHandler): void {
    this.handlers.set(name, handler);
  }

  /**
   * 의도에 따른 적절한 핸들러 선택
   */
  route(enhancedPrompt: EnhancedPrompt): ActionHandler | null {
    const { intent, target, action } = enhancedPrompt;

    // 라우팅 규칙에 따른 핸들러 선택
    const matchedRule = this.findMatchingRule(
      intent.type,
      target.type,
      action.type
    );

    if (matchedRule) {
      const handler = this.handlers.get(matchedRule.handler);
      if (handler && handler.canHandle(intent.type, target.type)) {
        return handler;
      }
    }

    // 기본 핸들러 반환
    return this.handlers.get('default') || null;
  }

  /**
   * 라우팅 규칙 매칭
   */
  private findMatchingRule(
    intent: string,
    target: string,
    action: string
  ): RoutingRule | null {
    // 우선순위가 높은 순서로 정렬
    const sortedRules = [...this.routingRules].sort(
      (a, b) => b.priority - a.priority
    );

    for (const rule of sortedRules) {
      if (this.matchesRule(rule, intent, target, action)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * 규칙 매칭 확인
   */
  private matchesRule(
    rule: RoutingRule,
    intent: string,
    target: string,
    action: string
  ): boolean {
    // 의도 매칭
    if (rule.intent !== intent) {
      return false;
    }

    // 대상 매칭 (선택적)
    if (rule.target && rule.target !== target) {
      return false;
    }

    // 액션 매칭 (선택적)
    if (rule.action && rule.action !== action) {
      return false;
    }

    return true;
  }

  /**
   * 라우팅 규칙 초기화
   */
  private initializeRoutingRules(): RoutingRule[] {
    return [
      // 프로젝트 생성
      {
        intent: 'project_creation',
        handler: 'projectCreationHandler',
        priority: 100,
        description: '새 프로젝트 생성 처리',
      },

      // 페이지 생성
      {
        intent: 'page_creation',
        handler: 'pageCreationHandler',
        priority: 90,
        description: '새 페이지 생성 처리',
      },

      // 컴포넌트 생성
      {
        intent: 'component_creation',
        handler: 'componentCreationHandler',
        priority: 85,
        description: '새 컴포넌트 생성 처리',
      },

      // 페이지 수정
      {
        intent: 'page_modification',
        handler: 'pageModificationHandler',
        priority: 80,
        description: '페이지 수정 처리',
      },

      // 컴포넌트 수정
      {
        intent: 'component_modification',
        handler: 'componentModificationHandler',
        priority: 75,
        description: '컴포넌트 수정 처리',
      },

      // 버그 수정
      {
        intent: 'bug_fix',
        handler: 'bugFixHandler',
        priority: 70,
        description: '버그 수정 처리',
      },

      // 기능 요청
      {
        intent: 'feature_request',
        handler: 'featureRequestHandler',
        priority: 65,
        description: '기능 요청 처리',
      },

      // 코드 리뷰
      {
        intent: 'code_review',
        handler: 'codeReviewHandler',
        priority: 60,
        description: '코드 리뷰 처리',
      },

      // 질문
      {
        intent: 'question',
        handler: 'questionHandler',
        priority: 50,
        description: '질문 처리',
      },

      // 불만/넋두리
      {
        intent: 'complaint',
        handler: 'complaintHandler',
        priority: 45,
        description: '불만/넋두리 처리',
      },

      // 일반 대화
      {
        intent: 'general',
        handler: 'generalHandler',
        priority: 10,
        description: '일반 대화 처리',
      },
    ];
  }

  /**
   * 라우팅 정보 조회
   */
  getRoutingInfo(enhancedPrompt: EnhancedPrompt): {
    matchedRule: RoutingRule | null;
    selectedHandler: string | null;
    alternatives: RoutingRule[];
  } {
    const matchedRule = this.findMatchingRule(
      enhancedPrompt.intent.type,
      enhancedPrompt.target.type,
      enhancedPrompt.action.type
    );

    const alternatives = this.routingRules.filter(
      (rule) => rule.intent === enhancedPrompt.intent.type
    );

    return {
      matchedRule,
      selectedHandler: matchedRule?.handler || null,
      alternatives,
    };
  }

  /**
   * 등록된 핸들러 목록 조회
   */
  getRegisteredHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 라우팅 규칙 목록 조회
   */
  getRoutingRules(): RoutingRule[] {
    return [...this.routingRules];
  }
}

/**
 * 기본 핸들러들
 */

// 프로젝트 생성 핸들러
export class ProjectCreationHandler implements ActionHandler {
  name = 'projectCreationHandler';
  description = '새 프로젝트 생성 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'project_creation';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      // 향상된 메시지에서 의미있는 프로젝트명 생성
      const projectName = this.generateMeaningfulProjectName(
        enhancedPrompt.enhancedMessage
      );

      // 새 프로젝트 생성 로직
      const projectData = {
        name: projectName,
        type: enhancedPrompt.action.parameters.projectType || 'web',
        features: enhancedPrompt.action.parameters.features || ['core'],
        description: enhancedPrompt.enhancedMessage,
      };

      return {
        success: true,
        message: `새 프로젝트 "${projectData.name}" 생성 요청을 처리합니다.`,
        data: projectData,
        nextAction: 'create_project',
      };
    } catch (error) {
      return {
        success: false,
        message: '프로젝트 생성 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private generateMeaningfulProjectName(message: string): string {
    const lowerMessage = message.toLowerCase();
    const timestamp = Date.now();

    // SNS 관련 키워드
    if (
      lowerMessage.includes('sns') ||
      lowerMessage.includes('소셜') ||
      lowerMessage.includes('게시물') ||
      lowerMessage.includes('피드')
    ) {
      const socialNames = [
        '소셜커넥트',
        '소셜허브',
        '커뮤니티존',
        '소셜스페이스',
        '프렌드허브',
        '소셜매직',
        '커넥트존',
        '소셜팩토리',
        '프렌드스튜디오',
        '소셜크래프트',
      ];
      return socialNames[timestamp % socialNames.length];
    }

    // 블로그 관련 키워드
    if (lowerMessage.includes('블로그') || lowerMessage.includes('포스트')) {
      const blogNames = [
        '블로그스페이스',
        '포스트허브',
        '스토리랩',
        '컨텐츠스튜디오',
        '블로그마스터',
      ];
      return blogNames[timestamp % blogNames.length];
    }

    // 쇼핑 관련 키워드
    if (
      lowerMessage.includes('쇼핑') ||
      lowerMessage.includes('커머스') ||
      lowerMessage.includes('결제')
    ) {
      const shopNames = [
        '스마트쇼핑',
        '커머스허브',
        '쇼핑존',
        '마켓플레이스',
        '스토어랩',
      ];
      return shopNames[timestamp % shopNames.length];
    }

    // 학습 관련 키워드
    if (
      lowerMessage.includes('학습') ||
      lowerMessage.includes('퀴즈') ||
      lowerMessage.includes('교육')
    ) {
      const learnNames = [
        '러닝플로우',
        '에듀허브',
        '스터디존',
        '학습스페이스',
        '지식랩',
      ];
      return learnNames[timestamp % learnNames.length];
    }

    // 게임 관련 키워드
    if (
      lowerMessage.includes('게임') ||
      lowerMessage.includes('엔터테인먼트')
    ) {
      const gameNames = [
        '게임존',
        '플레이허브',
        '엔터테인먼트랩',
        '게임스튜디오',
        '플레이존',
      ];
      return gameNames[timestamp % gameNames.length];
    }

    // 채팅 관련 키워드
    if (lowerMessage.includes('채팅') || lowerMessage.includes('메시지')) {
      const chatNames = [
        '채팅허브',
        '메시지존',
        '커뮤니케이션랩',
        '채팅스페이스',
        '톡허브',
      ];
      return chatNames[timestamp % chatNames.length];
    }

    // 기본 창의적인 이름들
    const defaultNames = [
      '네오스페이스',
      '퓨처허브',
      '인노베이션존',
      '크리에이티브랩',
      '테크플로우',
      '디지털스튜디오',
      '아이디어팩토리',
      '스마트워크스',
      '클라우드네스트',
      '데이터허브',
      '코드스튜디오',
      '웹크래프트',
      '앱마스터',
      '디지털아트',
      '테크마스터',
      '매직랩',
      '크래프트존',
      '팩토리스페이스',
      '스튜디오허브',
      '플로우크래프트',
      '네오매직',
      '퓨처크래프트',
      '인노베이션매직',
      '크리에이티브매직',
      '테크크래프트',
      '디지털매직',
      '아이디어크래프트',
      '스마트매직',
      '클라우드크래프트',
      '데이터매직',
    ];

    return defaultNames[timestamp % defaultNames.length];
  }
}

// 페이지 생성 핸들러
export class PageCreationHandler implements ActionHandler {
  name = 'pageCreationHandler';
  description = '새 페이지 생성 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'page_creation';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      const pageData = {
        name: enhancedPrompt.target.name || '새 페이지',
        type: enhancedPrompt.action.parameters.pageType || 'content',
        features: enhancedPrompt.action.parameters.features || [],
        description: enhancedPrompt.enhancedMessage,
      };

      return {
        success: true,
        message: `새 페이지 "${pageData.name}" 생성 요청을 처리합니다.`,
        data: pageData,
        nextAction: 'create_page',
      };
    } catch (error) {
      return {
        success: false,
        message: '페이지 생성 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 컴포넌트 생성 핸들러
export class ComponentCreationHandler implements ActionHandler {
  name = 'componentCreationHandler';
  description = '새 컴포넌트 생성 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'component_creation';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      const componentData = {
        name: enhancedPrompt.target.name || '새 컴포넌트',
        type: enhancedPrompt.action.parameters.componentType || 'ui',
        props: enhancedPrompt.action.parameters.props || {},
        description: enhancedPrompt.enhancedMessage,
      };

      return {
        success: true,
        message: `새 컴포넌트 "${componentData.name}" 생성 요청을 처리합니다.`,
        data: componentData,
        nextAction: 'create_component',
      };
    } catch (error) {
      return {
        success: false,
        message: '컴포넌트 생성 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 페이지 수정 핸들러
export class PageModificationHandler implements ActionHandler {
  name = 'pageModificationHandler';
  description = '페이지 수정 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'page_modification';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      const modificationData = {
        targetPage: enhancedPrompt.target.name || '현재 페이지',
        modifications: enhancedPrompt.action.parameters.modifications || {},
        description: enhancedPrompt.enhancedMessage,
      };

      return {
        success: true,
        message: `페이지 "${modificationData.targetPage}" 수정 요청을 처리합니다.`,
        data: modificationData,
        nextAction: 'modify_page',
      };
    } catch (error) {
      return {
        success: false,
        message: '페이지 수정 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 컴포넌트 수정 핸들러
export class ComponentModificationHandler implements ActionHandler {
  name = 'componentModificationHandler';
  description = '컴포넌트 수정 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'component_modification';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      const modificationData = {
        targetComponent:
          enhancedPrompt.target.name ||
          userContext.currentComponent?.displayName ||
          '현재 컴포넌트',
        modifications: enhancedPrompt.action.parameters.modifications || {},
        description: enhancedPrompt.enhancedMessage,
      };

      return {
        success: true,
        message: `컴포넌트 "${modificationData.targetComponent}" 수정 요청을 처리합니다.`,
        data: modificationData,
        nextAction: 'modify_component',
      };
    } catch (error) {
      return {
        success: false,
        message: '컴포넌트 수정 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 버그 수정 핸들러
export class BugFixHandler implements ActionHandler {
  name = 'bugFixHandler';
  description = '버그 수정 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'bug_fix';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      const bugFixData = {
        issue: enhancedPrompt.action.parameters.issue || '알 수 없는 버그',
        severity: enhancedPrompt.action.parameters.severity || 'medium',
        target: enhancedPrompt.target.description || '전체 시스템',
        description: enhancedPrompt.enhancedMessage,
      };

      return {
        success: true,
        message: `버그 수정 요청을 처리합니다.`,
        data: bugFixData,
        nextAction: 'fix_bug',
      };
    } catch (error) {
      return {
        success: false,
        message: '버그 수정 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 기능 요청 핸들러
export class FeatureRequestHandler implements ActionHandler {
  name = 'featureRequestHandler';
  description = '기능 요청 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'feature_request';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      const featureData = {
        feature: enhancedPrompt.action.parameters.feature || '새 기능',
        priority: enhancedPrompt.action.parameters.priority || 'medium',
        target: enhancedPrompt.target.description || '현재 프로젝트',
        description: enhancedPrompt.enhancedMessage,
      };

      return {
        success: true,
        message: `기능 요청을 처리합니다.`,
        data: featureData,
        nextAction: 'implement_feature',
      };
    } catch (error) {
      return {
        success: false,
        message: '기능 요청 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 코드 리뷰 핸들러
export class CodeReviewHandler implements ActionHandler {
  name = 'codeReviewHandler';
  description = '코드 리뷰 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'code_review';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      const reviewData = {
        target: enhancedPrompt.target.description || '전체 코드',
        aspects: enhancedPrompt.action.parameters.aspects || [
          'performance',
          'security',
          'readability',
        ],
        description: enhancedPrompt.enhancedMessage,
      };

      return {
        success: true,
        message: `코드 리뷰 요청을 처리합니다.`,
        data: reviewData,
        nextAction: 'review_code',
      };
    } catch (error) {
      return {
        success: false,
        message: '코드 리뷰 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 질문 핸들러
export class QuestionHandler implements ActionHandler {
  name = 'questionHandler';
  description = '질문 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'question';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      const questionData = {
        question: enhancedPrompt.enhancedMessage,
        context: enhancedPrompt.context,
        description: enhancedPrompt.enhancedMessage,
      };

      return {
        success: true,
        message: `질문에 답변합니다.`,
        data: questionData,
        nextAction: 'answer_question',
      };
    } catch (error) {
      return {
        success: false,
        message: '질문 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 불만/넋두리 핸들러
export class ComplaintHandler implements ActionHandler {
  name = 'complaintHandler';
  description = '불만/넋두리 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'complaint';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      const complaintData = {
        complaint: enhancedPrompt.enhancedMessage,
        context: enhancedPrompt.context,
        isVague: enhancedPrompt.intent.isVague,
        clarification: enhancedPrompt.intent.clarification,
        description: enhancedPrompt.enhancedMessage,
      };

      // 모호한 불만인 경우 구체화 제안
      if (
        enhancedPrompt.intent.isVague &&
        enhancedPrompt.intent.clarification
      ) {
        return {
          success: true,
          message: `불만을 이해했습니다. 구체적으로 무엇을 개선하고 싶으신지 확인해보겠습니다.`,
          data: {
            ...complaintData,
            suggestions: [
              '어떤 부분이 마음에 들지 않으신가요? (색상, 크기, 위치, 텍스트 등)',
              '어떻게 변경하고 싶으신가요?',
              '구체적인 요청을 해주시면 바로 도와드리겠습니다.',
            ],
          },
          nextAction: 'clarify_complaint',
        };
      }

      return {
        success: true,
        message: `불만을 이해했습니다. 개선 방안을 제안해드리겠습니다.`,
        data: complaintData,
        nextAction: 'suggest_improvement',
      };
    } catch (error) {
      return {
        success: false,
        message: '불만 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 일반 대화 핸들러
export class GeneralHandler implements ActionHandler {
  name = 'generalHandler';
  description = '일반 대화 처리';

  canHandle(intent: string, target: string): boolean {
    return intent === 'general';
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    try {
      const message = enhancedPrompt.originalMessage.toLowerCase();

      // 인사말에 대한 적절한 응답
      if (message.includes('안녕') || message.includes('하이') || message.includes('반갑')) {
        return {
          success: true,
          message: '안녕하세요! 무엇을 도와드릴까요?',
          data: {
            message: enhancedPrompt.enhancedMessage,
            context: enhancedPrompt.context,
            type: 'greeting',
          },
          nextAction: 'general_conversation',
        };
      }

      // 기타 일반 대화
      const generalData = {
        message: enhancedPrompt.enhancedMessage,
        context: enhancedPrompt.context,
        description: enhancedPrompt.enhancedMessage,
      };

      return {
        success: true,
        message: `네, 말씀해주세요. 무엇을 도와드릴까요?`,
        data: generalData,
        nextAction: 'general_conversation',
      };
    } catch (error) {
      return {
        success: false,
        message: '일반 대화 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 기본 핸들러
export class DefaultHandler implements ActionHandler {
  name = 'default';
  description = '기본 처리';

  canHandle(intent: string, target: string): boolean {
    return true; // 모든 의도를 처리할 수 있음
  }

  async execute(
    enhancedPrompt: EnhancedPrompt,
    userContext: UserContext,
    sessionId: string
  ): Promise<ActionResult> {
    return {
      success: true,
      message: `기본 처리로 요청을 처리합니다.`,
      data: {
        intent: enhancedPrompt.intent,
        target: enhancedPrompt.target,
        action: enhancedPrompt.action,
        message: enhancedPrompt.enhancedMessage,
      },
      nextAction: 'default_processing',
    };
  }
}

// 싱글톤 인스턴스 생성 및 기본 핸들러 등록
export const actionRouter = new ActionRouter();

// 기본 핸들러들 등록
actionRouter.registerHandler(
  'projectCreationHandler',
  new ProjectCreationHandler()
);
actionRouter.registerHandler('pageCreationHandler', new PageCreationHandler());
actionRouter.registerHandler(
  'componentCreationHandler',
  new ComponentCreationHandler()
);
actionRouter.registerHandler(
  'pageModificationHandler',
  new PageModificationHandler()
);
actionRouter.registerHandler(
  'componentModificationHandler',
  new ComponentModificationHandler()
);
actionRouter.registerHandler('bugFixHandler', new BugFixHandler());
actionRouter.registerHandler(
  'featureRequestHandler',
  new FeatureRequestHandler()
);
actionRouter.registerHandler('codeReviewHandler', new CodeReviewHandler());
actionRouter.registerHandler('questionHandler', new QuestionHandler());
actionRouter.registerHandler('complaintHandler', new ComplaintHandler());
actionRouter.registerHandler('generalHandler', new GeneralHandler());
actionRouter.registerHandler('default', new DefaultHandler());
