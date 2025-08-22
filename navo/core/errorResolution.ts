/**
 * 자동 에러 해결 시스템 - 에이전트 기반 아키텍처
 *
 * 이 시스템은 런타임 에러 발생 시 AI가 자동으로 분석하고 수정하여
 * 애플리케이션을 정상 상태로 복원합니다.
 */

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * 에러 해결 에이전트의 기본 인터페이스
 */
export interface ErrorResolutionAgent {
  /** 에이전트 이름 */
  name: string;
  /** 우선순위 (낮을수록 높은 우선순위) */
  priority: number;
  /** 이 에이전트가 처리할 수 있는 에러인지 확인 */
  canHandle(error: Error): boolean;
  /** 에러 해결 실행 */
  execute(error: Error, context: ErrorContext): Promise<ResolutionResult>;
}

/**
 * 에러 발생 컨텍스트 정보
 */
export interface ErrorContext {
  /** 에러 발생 시간 */
  timestamp: Date;
  /** 사용자 에이전트 */
  userAgent: string;
  /** 현재 URL */
  url: string;
  /** 프로젝트 ID (있는 경우) */
  projectId?: string;
  /** 세션 ID */
  sessionId: string;
  /** 추가 컨텍스트 데이터 */
  metadata?: Record<string, any>;
}

/**
 * 에러 해결 결과
 */
export interface ResolutionResult {
  /** 해결 성공 여부 */
  success: boolean;
  /** 수행된 변경사항들 */
  changes: CodeChange[];
  /** 실행 시간 (밀리초) */
  executionTime: number;
  /** 새로 발생한 에러들 */
  newErrors?: Error[];
  /** 에러 메시지 (실패 시) */
  errorMessage?: string;
  /** 다음 단계 제안 */
  nextSteps?: string[];
}

/**
 * 코드 변경사항
 */
export interface CodeChange {
  /** 변경할 파일 경로 */
  file: string;
  /** 변경 유형 */
  action: 'create' | 'modify' | 'delete' | 'replace' | 'rollback';
  /** 새로운 코드 내용 */
  content?: string;
  /** 변경 이유 */
  reason: string;
  /** 백업 파일 경로 */
  backupPath?: string;
  /** 변경 전 내용 */
  originalContent?: string;
}

// ============================================================================
// Error Types Classification
// ============================================================================

/**
 * 에러 타입 분류
 */
export enum ErrorType {
  // DOM 관련 에러
  NULL_REFERENCE = 'null_reference',
  ELEMENT_NOT_FOUND = 'element_not_found',
  DOM_MANIPULATION = 'dom_manipulation',

  // API 관련 에러
  NETWORK_ERROR = 'network_error',
  API_RESPONSE_ERROR = 'api_response_error',
  AUTHENTICATION_ERROR = 'authentication_error',

  // 타입 관련 에러
  TYPE_ERROR = 'type_error',
  UNDEFINED_ERROR = 'undefined_error',
  VALIDATION_ERROR = 'validation_error',

  // 로직 관련 에러
  INFINITE_LOOP = 'infinite_loop',
  MEMORY_LEAK = 'memory_leak',
  TIMEOUT_ERROR = 'timeout_error',

  // 기타
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * 에러 심각도
 */
export enum ErrorSeverity {
  CRITICAL = 'critical', // 애플리케이션 중단
  HIGH = 'high', // 주요 기능 장애
  MEDIUM = 'medium', // 일부 기능 장애
  LOW = 'low', // 경고 수준
}

/**
 * 에러 분석 결과
 */
export interface ErrorAnalysis {
  /** 에러 타입 */
  errorType: ErrorType;
  /** 근본 원인 */
  rootCause: string;
  /** 심각도 */
  severity: ErrorSeverity;
  /** 해결 방법 */
  solution: {
    /** 해결 방법 설명 */
    description: string;
    /** 코드 변경사항들 */
    codeChanges: CodeChange[];
    /** 예상 소요 시간 (초) */
    estimatedTime: number;
    /** 자동 복구 가능 여부 */
    autoRecoverable: boolean;
  };
  /** 추가 정보 */
  metadata?: Record<string, any>;
}

// ============================================================================
// Base Agent Implementation
// ============================================================================

/**
 * 에이전트의 기본 구현 클래스
 */
export abstract class BaseAgent implements ErrorResolutionAgent {
  constructor(
    public readonly name: string,
    public readonly priority: number
  ) {}

  abstract canHandle(error: Error): boolean;
  abstract execute(
    error: Error,
    context: ErrorContext
  ): Promise<ResolutionResult>;

  /**
   * 에이전트 실행 시간 측정
   */
  protected async measureExecutionTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now();
    const result = await operation();
    const executionTime = Date.now() - startTime;

    return { result, executionTime };
  }

  /**
   * 에러 로깅
   */
  protected logError(
    error: Error,
    context: ErrorContext,
    message: string
  ): void {
    console.error(`[${this.name}] ${message}:`, {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 성공 로깅
   */
  protected logSuccess(
    context: ErrorContext,
    message: string,
    data?: any
  ): void {
    console.log(`[${this.name}] ✅ ${message}:`, {
      context,
      data,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Agent Registry
// ============================================================================

/**
 * 에이전트 레지스트리 - 등록된 에이전트들을 관리
 */
export class AgentRegistry {
  private agents: ErrorResolutionAgent[] = [];

  /**
   * 에이전트 등록
   */
  register(agent: ErrorResolutionAgent): void {
    this.agents.push(agent);
    // 우선순위에 따라 정렬 (낮은 숫자가 높은 우선순위)
    this.agents.sort((a, b) => a.priority - b.priority);

    console.log(
      `[AgentRegistry] 에이전트 등록됨: ${agent.name} (우선순위: ${agent.priority})`
    );
  }

  /**
   * 에러를 처리할 수 있는 에이전트 찾기
   */
  findAgentForError(error: Error): ErrorResolutionAgent | null {
    for (const agent of this.agents) {
      if (agent.canHandle(error)) {
        console.log(`[AgentRegistry] 에러 처리 에이전트 찾음: ${agent.name}`);
        return agent;
      }
    }

    console.warn(
      `[AgentRegistry] 에러를 처리할 수 있는 에이전트가 없음:`,
      error.message
    );
    return null;
  }

  /**
   * 등록된 모든 에이전트 목록
   */
  getAllAgents(): ErrorResolutionAgent[] {
    return [...this.agents];
  }

  /**
   * 에이전트 레지스트리 초기화
   */
  clear(): void {
    this.agents = [];
    console.log(`[AgentRegistry] 모든 에이전트 제거됨`);
  }
}

// ============================================================================
// Error Resolution Manager
// ============================================================================

/**
 * 에러 해결 관리자 - 전체 에러 해결 프로세스를 조율
 */
export class ErrorResolutionManager {
  private registry: AgentRegistry;
  private isProcessing = false;

  constructor() {
    this.registry = new AgentRegistry();
  }

  /**
   * 에이전트 등록
   */
  registerAgent(agent: ErrorResolutionAgent): void {
    this.registry.register(agent);
  }

  /**
   * 에러 해결 시도
   */
  async resolveError(
    error: Error,
    context: ErrorContext
  ): Promise<ResolutionResult> {
    if (this.isProcessing) {
      console.warn(
        `[ErrorResolutionManager] 이미 에러 해결 중입니다. 대기 중...`
      );
      // 이미 처리 중이면 대기
      await this.waitForProcessing();
    }

    this.isProcessing = true;

    try {
      console.log(`[ErrorResolutionManager] 에러 해결 시작:`, error.message);

      // 적절한 에이전트 찾기
      const agent = this.registry.findAgentForError(error);
      if (!agent) {
        return {
          success: false,
          changes: [],
          executionTime: 0,
          errorMessage: '에러를 처리할 수 있는 에이전트가 없습니다.',
          nextSteps: ['수동 디버깅이 필요합니다.'],
        };
      }

      // 에이전트 실행
      const result = await agent.execute(error, context);

      console.log(`[ErrorResolutionManager] 에러 해결 완료:`, {
        success: result.success,
        executionTime: result.executionTime,
        changes: result.changes.length,
      });

      return result;
    } catch (e) {
      console.error(`[ErrorResolutionManager] 에러 해결 중 오류 발생:`, e);

      return {
        success: false,
        changes: [],
        executionTime: 0,
        errorMessage: `에러 해결 중 오류 발생: ${e instanceof Error ? e.message : String(e)}`,
        nextSteps: ['시스템 관리자에게 문의하세요.'],
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 처리 완료 대기
   */
  private async waitForProcessing(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isProcessing) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * 현재 상태 확인
   */
  getStatus(): { isProcessing: boolean; registeredAgents: number } {
    return {
      isProcessing: this.isProcessing,
      registeredAgents: this.registry.getAllAgents().length,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 에러 타입 추정
 */
export function estimateErrorType(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  if (message.includes('null') || message.includes('undefined')) {
    return ErrorType.NULL_REFERENCE;
  }

  if (message.includes('element') || message.includes('dom')) {
    return ErrorType.ELEMENT_NOT_FOUND;
  }

  if (message.includes('network') || message.includes('fetch')) {
    return ErrorType.NETWORK_ERROR;
  }

  if (message.includes('type') || message.includes('cannot read')) {
    return ErrorType.TYPE_ERROR;
  }

  if (message.includes('timeout')) {
    return ErrorType.TIMEOUT_ERROR;
  }

  return ErrorType.UNKNOWN_ERROR;
}

/**
 * 에러 심각도 추정
 */
export function estimateErrorSeverity(
  error: Error,
  context: ErrorContext
): ErrorSeverity {
  const errorType = estimateErrorType(error);

  // DOM 관련 에러는 보통 중간 정도의 심각도
  if (
    [ErrorType.NULL_REFERENCE, ErrorType.ELEMENT_NOT_FOUND].includes(errorType)
  ) {
    return ErrorSeverity.MEDIUM;
  }

  // 네트워크 에러는 높은 심각도
  if (
    [ErrorType.NETWORK_ERROR, ErrorType.API_RESPONSE_ERROR].includes(errorType)
  ) {
    return ErrorSeverity.HIGH;
  }

  // 타입 에러는 보통 낮은 심각도
  if ([ErrorType.TYPE_ERROR, ErrorType.VALIDATION_ERROR].includes(errorType)) {
    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM;
}
