import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserContext, ChatMessage } from "./contextManager.js";

/**
 * 향상된 프롬프트 인터페이스
 */
export interface EnhancedPrompt {
  originalMessage: string;
  enhancedMessage: string;
  intent: {
    type: string;
    confidence: number;
    description: string;
  };
  target: {
    type: string;
    id?: string;
    name?: string;
    description?: string;
  };
  action: {
    type: string;
    parameters: Record<string, any>;
    description: string;
  };
  context: {
    projectContext?: string;
    componentContext?: string;
    conversationContext?: string;
  };
  metadata: {
    model: string;
    tokens: number;
    processingTime: number;
    timestamp: Date;
  };
}

/**
 * 의도 분석 결과
 */
export interface IntentAnalysis {
  type: string;
  confidence: number;
  description: string;
  alternatives?: Array<{
    type: string;
    confidence: number;
    description: string;
  }>;
}

/**
 * 대상 분석 결과
 */
export interface TargetAnalysis {
  type: string;
  id?: string;
  name?: string;
  description?: string;
  path?: string;
}

/**
 * 액션 분석 결과
 */
export interface ActionAnalysis {
  type: string;
  parameters: Record<string, any>;
  description: string;
  priority: number;
}

/**
 * PromptEnhancer 클래스
 * AI 기반 프롬프트 개선으로 사용자 요청을 명확하게 변환합니다.
 */
export class PromptEnhancer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  /**
   * 사용자 메시지를 향상된 프롬프트로 변환
   */
  async enhance(
    message: string,
    userContext: UserContext,
    recentMessages?: ChatMessage[]
  ): Promise<EnhancedPrompt> {
    const startTime = Date.now();

    try {
      // 컨텍스트 정보 구성
      const contextInfo = this.buildContextInfo(userContext, recentMessages);

      // AI 기반 분석 수행
      const [intentAnalysis, targetAnalysis, actionAnalysis] =
        await Promise.all([
          this.analyzeIntent(message, contextInfo),
          this.analyzeTarget(message, contextInfo),
          this.analyzeAction(message, contextInfo),
        ]);

      // 향상된 메시지 생성
      const enhancedMessage = await this.generateEnhancedMessage(
        message,
        intentAnalysis,
        targetAnalysis,
        actionAnalysis,
        contextInfo
      );

      const processingTime = Date.now() - startTime;

      return {
        originalMessage: message,
        enhancedMessage,
        intent: {
          type: intentAnalysis.type,
          confidence: intentAnalysis.confidence,
          description: intentAnalysis.description,
        },
        target: {
          type: targetAnalysis.type,
          id: targetAnalysis.id,
          name: targetAnalysis.name,
          description: targetAnalysis.description,
        },
        action: {
          type: actionAnalysis.type,
          parameters: actionAnalysis.parameters,
          description: actionAnalysis.description,
        },
        context: {
          projectContext: contextInfo.projectContext,
          componentContext: contextInfo.componentContext,
          conversationContext: contextInfo.conversationContext,
        },
        metadata: {
          model: "gemini-2.5-flash",
          tokens: 0, // TODO: 실제 토큰 수 계산
          processingTime,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      // Fallback: 기본 향상된 프롬프트 반환
      return this.createFallbackPrompt(message, userContext);
    }
  }

  /**
   * 컨텍스트 정보 구성
   */
  private buildContextInfo(
    userContext: UserContext,
    recentMessages?: ChatMessage[]
  ): {
    projectContext?: string;
    componentContext?: string;
    conversationContext?: string;
  } {
    const contextInfo: any = {};

    // 프로젝트 컨텍스트
    if (userContext.currentProject) {
      contextInfo.projectContext = `현재 작업 중인 프로젝트: ${userContext.currentProject.name}${
        userContext.currentProject.description
          ? ` (${userContext.currentProject.description})`
          : ""
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
        .join("\n");
      contextInfo.conversationContext = `최근 대화:\n${recentTexts}`;
    }

    return contextInfo;
  }

  /**
   * 의도 분석
   */
  private async analyzeIntent(
    message: string,
    contextInfo: any
  ): Promise<IntentAnalysis> {
    const prompt = `다음 사용자 메시지의 의도를 분석해주세요.

컨텍스트 정보:
${contextInfo.projectContext ? `- ${contextInfo.projectContext}` : ""}
${contextInfo.componentContext ? `- ${contextInfo.componentContext}` : ""}
${contextInfo.conversationContext ? `- ${contextInfo.conversationContext}` : ""}

사용자 메시지: "${message}"

의도 타입:
- project_creation: 새 프로젝트 생성
- project_modification: 기존 프로젝트 수정
- component_creation: 새 컴포넌트 생성
- component_modification: 기존 컴포넌트 수정
- code_review: 코드 리뷰 요청
- bug_fix: 버그 수정 요청
- feature_request: 기능 요청
- question: 질문
- general: 일반적인 대화

JSON 형태로 응답해주세요:
{
  "type": "의도_타입",
  "confidence": 0.95,
  "description": "의도에 대한 설명"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const analysis = JSON.parse(response);

      return {
        type: analysis.type,
        confidence: analysis.confidence || 0.8,
        description: analysis.description || "의도 분석 완료",
      };
    } catch (error) {
      console.error("Error analyzing intent:", error);
      return {
        type: "general",
        confidence: 0.5,
        description: "의도 분석 실패, 기본값 사용",
      };
    }
  }

  /**
   * 대상 분석
   */
  private async analyzeTarget(
    message: string,
    contextInfo: any
  ): Promise<TargetAnalysis> {
    const prompt = `다음 사용자 메시지에서 대상(target)을 분석해주세요.

컨텍스트 정보:
${contextInfo.projectContext ? `- ${contextInfo.projectContext}` : ""}
${contextInfo.componentContext ? `- ${contextInfo.componentContext}` : ""}

사용자 메시지: "${message}"

대상 타입:
- current_project: 현재 프로젝트
- current_component: 현재 컴포넌트
- specific_component: 특정 컴포넌트
- new_project: 새 프로젝트
- new_component: 새 컴포넌트
- general: 일반적인 대상

JSON 형태로 응답해주세요:
{
  "type": "대상_타입",
  "id": "대상_ID_또는_null",
  "name": "대상_이름",
  "description": "대상_설명"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const analysis = JSON.parse(response);

      return {
        type: analysis.type,
        id: analysis.id,
        name: analysis.name,
        description: analysis.description,
      };
    } catch (error) {
      console.error("Error analyzing target:", error);
      return {
        type: "general",
        description: "대상 분석 실패, 기본값 사용",
      };
    }
  }

  /**
   * 액션 분석
   */
  private async analyzeAction(
    message: string,
    contextInfo: any
  ): Promise<ActionAnalysis> {
    const prompt = `다음 사용자 메시지에서 수행할 액션을 분석해주세요.

컨텍스트 정보:
${contextInfo.projectContext ? `- ${contextInfo.projectContext}` : ""}
${contextInfo.componentContext ? `- ${contextInfo.componentContext}` : ""}

사용자 메시지: "${message}"

액션 타입:
- create: 생성
- modify: 수정
- delete: 삭제
- review: 리뷰
- fix: 수정
- enhance: 개선
- explain: 설명
- suggest: 제안

JSON 형태로 응답해주세요:
{
  "type": "액션_타입",
  "parameters": {
    "parameter1": "값1",
    "parameter2": "값2"
  },
  "description": "액션_설명",
  "priority": 1
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const analysis = JSON.parse(response);

      return {
        type: analysis.type,
        parameters: analysis.parameters || {},
        description: analysis.description || "액션 분석 완료",
        priority: analysis.priority || 1,
      };
    } catch (error) {
      console.error("Error analyzing action:", error);
      return {
        type: "explain",
        parameters: {},
        description: "액션 분석 실패, 기본값 사용",
        priority: 1,
      };
    }
  }

  /**
   * 향상된 메시지 생성
   */
  private async generateEnhancedMessage(
    originalMessage: string,
    intent: IntentAnalysis,
    target: TargetAnalysis,
    action: ActionAnalysis,
    contextInfo: any
  ): Promise<string> {
    const prompt = `다음 정보를 바탕으로 사용자 메시지를 더 명확하고 구체적으로 향상시켜주세요.

원본 메시지: "${originalMessage}"

분석 결과:
- 의도: ${intent.type} (${intent.description})
- 대상: ${target.type} ${target.name ? `(${target.name})` : ""}
- 액션: ${action.type} (${action.description})

컨텍스트:
${contextInfo.projectContext ? `- ${contextInfo.projectContext}` : ""}
${contextInfo.componentContext ? `- ${contextInfo.componentContext}` : ""}

향상된 메시지는 다음을 포함해야 합니다:
1. 명확한 의도 표현
2. 구체적인 대상 지정
3. 실행 가능한 액션 설명
4. 컨텍스트 정보 활용

향상된 메시지를 한국어로 작성해주세요.`;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Error generating enhanced message:", error);
      return originalMessage; // 실패 시 원본 메시지 반환
    }
  }

  /**
   * Fallback 프롬프트 생성
   */
  private createFallbackPrompt(
    message: string,
    userContext: UserContext
  ): EnhancedPrompt {
    return {
      originalMessage: message,
      enhancedMessage: message,
      intent: {
        type: "general",
        confidence: 0.5,
        description: "기본 의도",
      },
      target: {
        type: "general",
        description: "기본 대상",
      },
      action: {
        type: "explain",
        parameters: {},
        description: "기본 액션",
      },
      context: {
        projectContext: userContext.currentProject?.name,
        componentContext: userContext.currentComponent?.displayName,
      },
      metadata: {
        model: "fallback",
        tokens: 0,
        processingTime: 0,
        timestamp: new Date(),
      },
    };
  }

  /**
   * 의도별 프롬프트 템플릿 생성
   */
  generateIntentSpecificPrompt(
    enhancedPrompt: EnhancedPrompt,
    templateType: string
  ): string {
    const { intent, target, action, context } = enhancedPrompt;

    switch (templateType) {
      case "project_creation":
        return `프로젝트 생성 요청을 처리합니다.
의도: ${intent.description}
요청: ${enhancedPrompt.enhancedMessage}
프로젝트 타입: ${action.parameters.projectType || "웹 애플리케이션"}
기능 요구사항: ${action.parameters.features || "기본 기능"}`;

      case "component_modification":
        return `컴포넌트 수정 요청을 처리합니다.
의도: ${intent.description}
대상 컴포넌트: ${target.name || "현재 컴포넌트"}
수정 사항: ${action.description}
요청: ${enhancedPrompt.enhancedMessage}`;

      case "bug_fix":
        return `버그 수정 요청을 처리합니다.
의도: ${intent.description}
문제 영역: ${target.description || "전체 시스템"}
수정 유형: ${action.type}
요청: ${enhancedPrompt.enhancedMessage}`;

      default:
        return `일반 요청을 처리합니다.
의도: ${intent.description}
요청: ${enhancedPrompt.enhancedMessage}`;
    }
  }

  /**
   * 프롬프트 품질 평가
   */
  async evaluatePromptQuality(enhancedPrompt: EnhancedPrompt): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
  }> {
    const prompt = `다음 향상된 프롬프트의 품질을 평가해주세요.

원본 메시지: "${enhancedPrompt.originalMessage}"
향상된 메시지: "${enhancedPrompt.enhancedMessage}"

평가 기준:
1. 명확성 (0-10): 메시지가 얼마나 명확한가?
2. 구체성 (0-10): 얼마나 구체적인 정보를 포함하는가?
3. 실행 가능성 (0-10): 실제로 실행 가능한 요청인가?
4. 컨텍스트 활용 (0-10): 컨텍스트 정보를 잘 활용했는가?

JSON 형태로 응답해주세요:
{
  "score": 8.5,
  "feedback": "전체적으로 좋은 향상이 이루어졌습니다.",
  "suggestions": ["더 구체적인 기술 스택을 명시하세요", "예상 소요 시간을 추가하세요"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      return JSON.parse(response);
    } catch (error) {
      console.error("Error evaluating prompt quality:", error);
      return {
        score: 5.0,
        feedback: "품질 평가 실패",
        suggestions: ["기본 품질 평가 사용"],
      };
    }
  }
}

// 싱글톤 인스턴스 export
export const promptEnhancer = new PromptEnhancer(
  process.env.GEMINI_API_KEY || ""
);
