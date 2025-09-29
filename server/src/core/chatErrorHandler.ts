import { FastifyInstance } from "fastify";

export enum ChatErrorType {
  WORKFLOW_FAILURE = "workflow_failure",
  AI_SERVICE_ERROR = "ai_service_error",
  DATABASE_ERROR = "database_error",
  VALIDATION_ERROR = "validation_error",
  NETWORK_ERROR = "network_error",
  TIMEOUT_ERROR = "timeout_error",
  UNKNOWN_ERROR = "unknown_error",
}

export interface ChatErrorContext {
  userPrompt: string;
  userIntent?: string;
  projectId?: string;
  userId?: string;
  chatHistory: any[];
}

export interface ChatMessage {
  id: string;
  role: "assistant";
  content: string;
  timestamp: string;
  status: "error";
  isError: true;
  errorType: ChatErrorType;
  originalError?: string;
}

export class ChatErrorHandler {
  private app: FastifyInstance;

  private errorMessages = {
    [ChatErrorType.WORKFLOW_FAILURE]:
      "작업을 처리하는 중에 문제가 발생했습니다. 다시 시도해주세요.",
    [ChatErrorType.AI_SERVICE_ERROR]:
      "AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.",
    [ChatErrorType.DATABASE_ERROR]:
      "데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    [ChatErrorType.VALIDATION_ERROR]:
      "요청을 이해하지 못했습니다. 다른 방식으로 말씀해주세요.",
    [ChatErrorType.NETWORK_ERROR]:
      "네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.",
    [ChatErrorType.TIMEOUT_ERROR]:
      "응답 시간이 초과되었습니다. 다시 시도해주세요.",
    [ChatErrorType.UNKNOWN_ERROR]:
      "예상치 못한 문제가 발생했습니다. 다시 시도해주세요.",
  };

  constructor(app: FastifyInstance) {
    this.app = app;
  }

  /**
   * 에러를 분류합니다
   */
  private classifyError(error: Error): ChatErrorType {
    const message = error.message.toLowerCase();

    if (message.includes("workflow") || message.includes("plan")) {
      return ChatErrorType.WORKFLOW_FAILURE;
    }

    if (
      message.includes("ai") ||
      message.includes("model") ||
      message.includes("generative")
    ) {
      return ChatErrorType.AI_SERVICE_ERROR;
    }

    if (
      message.includes("database") ||
      message.includes("db") ||
      message.includes("query")
    ) {
      return ChatErrorType.DATABASE_ERROR;
    }

    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("required")
    ) {
      return ChatErrorType.VALIDATION_ERROR;
    }

    if (
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("timeout")
    ) {
      return ChatErrorType.NETWORK_ERROR;
    }

    if (message.includes("timeout") || message.includes("expired")) {
      return ChatErrorType.TIMEOUT_ERROR;
    }

    return ChatErrorType.UNKNOWN_ERROR;
  }

  /**
   * 컨텍스트에 따른 맞춤 메시지를 생성합니다
   */
  private generateContextualMessage(
    errorType: ChatErrorType,
    context: ChatErrorContext
  ): string {
    const baseMessage = this.errorMessages[errorType];

    // 사용자 의도에 따른 맞춤 메시지
    if (context.userIntent === "project_modification") {
      return `프로젝트 수정 작업 중 문제가 발생했습니다. ${baseMessage}`;
    }

    if (context.userIntent === "create_project") {
      return `새 프로젝트 생성 중 문제가 발생했습니다. ${baseMessage}`;
    }

    if (context.userIntent === "simple_chat") {
      return `질문 처리 중 문제가 발생했습니다. ${baseMessage}`;
    }

    return baseMessage;
  }

  /**
   * 채팅 에러를 처리하고 사용자 친화적 메시지를 반환합니다
   */
  async handleChatError(
    error: Error,
    context: ChatErrorContext
  ): Promise<ChatMessage> {
    const errorType = this.classifyError(error);
    const contextualMessage = this.generateContextualMessage(
      errorType,
      context
    );

    // 에러 로깅
    this.app.log.error(
      {
        error: error.message,
        stack: error.stack,
        errorType,
        context: {
          userPrompt: context.userPrompt,
          userIntent: context.userIntent,
          projectId: context.projectId,
          userId: context.userId,
        },
      },
      "[ChatErrorHandler] Chat error occurred"
    );

    return {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "assistant",
      content: contextualMessage,
      timestamp: new Date().toISOString(),
      status: "error",
      isError: true,
      errorType,
      originalError: error.message,
    };
  }

  /**
   * 에러 메시지를 채팅에 추가합니다
   */
  async addErrorMessageToChat(
    errorMessage: ChatMessage,
    projectId: string,
    userId: string
  ): Promise<void> {
    try {
      // TODO: 데이터베이스에 에러 메시지 저장
      // await this.projectsService.createMessage(projectId, userId, {
      //   role: "assistant",
      //   content: errorMessage.content,
      //   metadata: {
      //     isError: true,
      //     errorType: errorMessage.errorType,
      //     originalError: errorMessage.originalError
      //   }
      // });

      this.app.log.info(
        {
          messageId: errorMessage.id,
          errorType: errorMessage.errorType,
          projectId,
          userId,
        },
        "[ChatErrorHandler] Error message added to chat"
      );
    } catch (dbError) {
      this.app.log.error(
        dbError,
        "[ChatErrorHandler] Failed to save error message to database"
      );
    }
  }
}
