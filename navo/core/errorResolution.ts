/**
 * 자동 에러 해결 시스템 - 에이전트 기반 아키텍처
 *
 * 이 시스템은 런타임 에러 발생 시 AI가 자동으로 분석하고 수정하여
 * 애플리케이션을 정상 상태로 복원합니다.
 */

import { runGraph } from './runner.js';
import { GraphNode, NodeContext } from './node.js';

// Define AgentGraphNode type
export type AgentGraphNode = GraphNode & {
  execute: (error: Error, context: ErrorContext, outputs: Map<string, unknown>) => Promise<ResolutionResult>;
};

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
  execute(error: Error, context: ErrorContext, payload?: unknown): Promise<ResolutionResult>;
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
  /** 사람의 개입이 필요한지 여부 */
  humanInterventionRequired?: boolean;
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
  /** 변경할 라인 번호 (0-based) */
  lineNumber?: number;
  /** 변경할 시작 컬럼 (0-based) */
  startColumn?: number;
  /** 변경할 끝 컬럼 (0-based) */
  endColumn?: number;
  /** 변경 전 코드 내용 (replace/modify 액션 시 필요) */
  oldContent?: string;
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
  protected logger: Logger;

  constructor(
    public readonly name: string,
    public readonly priority: number
  ) {
    this.logger = new ConsoleLogger();
  }

  abstract canHandle(error: Error): boolean;
  abstract execute(
    error: Error,
    context: ErrorContext,
    payload?: unknown
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
    this.logger.error(`[${this.name}] ${message}:`, {
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
    this.logger.info(`[${this.name}] ✅ ${message}:`, {
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
  private logger: Logger;

  constructor() {
    this.logger = new ConsoleLogger();
  }

  register(agent: ErrorResolutionAgent): void {
    this.agents.push(agent);
    this.logger.info(`[AgentRegistry] Registered agent: ${agent.name}`);
  }

  list(): ErrorResolutionAgent[] {
    return [...this.agents];
  }
}

// ============================================================================
// Logger Interface and Implementation
// ============================================================================

export interface Logger {
  info(message: string, data?: Record<string, any>): void;
  warn(message: string, data?: Record<string, any>): void;
  error(message: string, data?: Record<string, any>): void;
}

export class ConsoleLogger implements Logger {
  info(message: string, data?: Record<string, any>): void {
    console.log(JSON.stringify({ level: 'info', message, ...data }));
  }
  warn(message: string, data?: Record<string, any>): void {
    console.warn(JSON.stringify({ level: 'warn', message, ...data }));
  }
  error(message: string, data?: Record<string, any>): void {
    console.error(JSON.stringify({ level: 'error', message, ...data }));
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
  private logger: Logger;

  constructor() {
    this.registry = new AgentRegistry();
    this.logger = new ConsoleLogger();
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
      this.logger.warn(
        `[ErrorResolutionManager] Already processing error. Waiting...`,
        { error: error.message }
      );
      // 이미 처리 중이면 대기
      await this.waitForProcessing();
    }

    this.isProcessing = true;

    try {
      const maxRetries = 3; // Define max retries
      let retryCount = 0;
      let finalResolutionResult: ResolutionResult = {
        success: false,
        changes: [],
        executionTime: 0,
        errorMessage: 'Automated resolution failed after multiple retries.',
        nextSteps: ['Manual debugging is required.'],
        humanInterventionRequired: true,
      };

      // Lazy-load agents here to avoid circular dependency with BaseAgent
      const [
        { ErrorAnalyzerAgent },
        { CodeFixerAgent },
        { TestRunnerAgent },
        { RollbackAgent },
      ] = await Promise.all([
        import('../agents/errorAnalyzerAgent.js'),
        import('../agents/codeFixerAgent.js'),
        import('../agents/testRunnerAgent.js'),
        import('../agents/rollbackAgent.js'),
      ]);

      while (retryCount < maxRetries) {
        this.logger.info(`Error resolution attempt ${retryCount + 1}/${maxRetries}`, { error: error.message, attempt: retryCount + 1, maxRetries: maxRetries });

        // Initialize agents (re-initialize for each retry to ensure fresh state)
        const errorAnalyzer = new ErrorAnalyzerAgent();
        const codeFixer = new CodeFixerAgent();
        const testRunner = new TestRunnerAgent();
        const rollbackAgent = new RollbackAgent();

        // Define graph nodes
        const nodes: GraphNode[] = [
          {
            name: 'analyzeError',
            deps: [],
            run: async (ctx: NodeContext) => {
              const result = await errorAnalyzer.execute(error, context);
              if (!result.success) {
                throw new Error(result.errorMessage || 'Error analysis failed');
              }
              return result;
            },
          },
          {
            name: 'fixCode',
            deps: ['analyzeError'],
            run: async (ctx: NodeContext) => {
              const analysisResult = ctx.outputs.get('analyzeError') as ResolutionResult;
              // Pass the codeChanges from analysis to the fixer
              const result = await codeFixer.execute(error, context, analysisResult.changes);
              if (!result.success) {
                throw new Error(result.errorMessage || 'Code fix failed');
              }
              return result;
            },
          },
          {
            name: 'runTests',
            deps: ['fixCode'],
            run: async (ctx: NodeContext) => {
              const fixResult = ctx.outputs.get('fixCode') as ResolutionResult;
              // Test if the fix resolved the error
              const result = await testRunner.execute(error, context, fixResult.changes); // Pass applied changes to test runner
              if (!result.success) {
                // If tests fail, we might need to trigger rollback
                throw new Error(result.errorMessage || 'Tests failed after fix');
              }
              return result;
            },
          },
          {
            name: 'rollbackChanges',
            deps: ['runTests'], // Rollback depends on test results
            run: async (ctx: NodeContext) => {
              const testResult = ctx.outputs.get('runTests') as ResolutionResult;
              if (!testResult.success) { // Only rollback if tests failed
                const fixResult = ctx.outputs.get('fixCode') as ResolutionResult;
                // Pass the changes that were applied by the fixer to the rollback agent
                const result = await rollbackAgent.execute(error, context, fixResult.changes);
                if (!result.success) {
                  throw new Error(result.errorMessage || 'Rollback failed');
                }
                return result;
              }
              return { success: true, changes: [], executionTime: 0, nextSteps: ['No rollback needed'] };
            },
          },
        ];

        // Prepare base context for runGraph
        const baseCtx = {
          logger: this.logger,
          error: error,
          context: context,
        };

        try {
          // Execute the graph
          const graphOutputs = await runGraph(nodes, baseCtx);

          // Determine result of this attempt
          const currentTestResult = graphOutputs.get('runTests') as ResolutionResult;
          const currentFixResult = graphOutputs.get('fixCode') as ResolutionResult;
          const currentRollbackResult = graphOutputs.get('rollbackChanges') as ResolutionResult;

          if (currentTestResult && currentTestResult.success) {
            finalResolutionResult = {
              success: true,
              changes: currentFixResult?.changes || [],
              executionTime: (currentFixResult?.executionTime || 0) + (currentTestResult?.executionTime || 0),
              nextSteps: ['Error successfully resolved and verified.'],
            };
            break; // Exit retry loop on success
          } else if (currentRollbackResult && currentRollbackResult.success) {
            finalResolutionResult = {
              success: false, // Fix failed, but rollback was successful
              changes: currentRollbackResult?.changes || [],
              executionTime: (currentFixResult?.executionTime || 0) + (currentTestResult?.executionTime || 0) + (currentRollbackResult?.executionTime || 0),
              errorMessage: 'Fix failed, but changes were rolled back.',
              nextSteps: ['Fix failed, changes rolled back. Retrying...'],
            };
            // Continue to next retry attempt
          } else {
            finalResolutionResult = {
              success: false,
              changes: [],
              executionTime: (currentFixResult?.executionTime || 0) + (currentTestResult?.executionTime || 0) + (currentRollbackResult?.executionTime || 0),
              errorMessage: 'Error resolution process failed in this attempt.',
              nextSteps: ['Automated resolution failed. Retrying...'],
            };
            // Continue to next retry attempt
          }
        } catch (graphError) {
          this.logger.error(`Graph execution failed in attempt ${retryCount + 1}:`, { error: graphError instanceof Error ? graphError.message : String(graphError), attempt: retryCount + 1 });
          finalResolutionResult = {
            success: false,
            changes: [],
            executionTime: 0,
            errorMessage: `Graph execution failed: ${graphError instanceof Error ? graphError.message : String(graphError)}`,
            nextSteps: ['Retrying...'],
          };
          // Continue to next retry attempt
        }

        retryCount++;
        if (!finalResolutionResult.success && retryCount < maxRetries) {
          // Optional: Add a delay before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        }
      }

      if (finalResolutionResult.humanInterventionRequired) {
        this.logger.warn(`[ErrorResolutionManager] Human intervention required. Automated resolution failed.`);
        return finalResolutionResult;
      }

      this.logger.info(`Error resolution completed:`, {
        success: finalResolutionResult.success,
        executionTime: finalResolutionResult.executionTime,
        changes: finalResolutionResult.changes.length,
      });

      return finalResolutionResult;
    } catch (e) {
      this.logger.error(`Error during error resolution process:`, { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : 'N/A' });

      return {
        success: false,
        changes: [],
        executionTime: 0,
        errorMessage: `에러 해결 중 오류 발생: ${e instanceof Error ? e.message : String(e)}`,
        nextSteps: ['시스템 관리자에게 문의하세요.'],
        humanInterventionRequired: true,
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
      registeredAgents: this.registry.list().length,
    };
  }

  /**
   * 사람의 피드백을 처리하고 다음 단계를 결정합니다.
   * @param previousResult 이전 에러 해결 시도 결과
   * @param humanInput 사람의 피드백 (예: 'approve', 'reject', 'retry', 'manual_fix')
   * @returns 다음 에러 해결 시도 결과 또는 최종 결과
   */
  async processHumanFeedback(
    previousResult: ResolutionResult,
    humanInput: 'approve' | 'reject' | 'retry' | 'manual_fix'
  ): Promise<ResolutionResult> {
    this.logger.info(`[ErrorResolutionManager] Processing human feedback: ${humanInput}`, { previousResult });

    switch (humanInput) {
      case 'approve':
        // 인간이 승인했으므로 성공으로 간주
        return {
          ...previousResult,
          success: true,
          humanInterventionRequired: false,
          nextSteps: ['Human approved the resolution.'],
        };
      case 'reject':
        // 인간이 거부했으므로 실패로 간주하고 수동 해결 필요
        return {
          ...previousResult,
          success: false,
          humanInterventionRequired: true,
          errorMessage: 'Human rejected the proposed resolution. Manual fix required.',
          nextSteps: ['Manual debugging is required.'],
        };
      case 'retry':
        // 재시도 로직 (새로운 에러로 간주하고 resolveError 호출)
        // 이 부분은 외부에서 resolveError를 다시 호출하도록 유도해야 함
        return {
          ...previousResult,
          success: false,
          humanInterventionRequired: false, // 재시도할 것이므로 더 이상 인간 개입 필요 없음
          errorMessage: 'Human requested a retry.',
          nextSteps: ['Retrying automated resolution...'],
        };
      case 'manual_fix':
        // 수동 해결 필요
        return {
          ...previousResult,
          success: false,
          humanInterventionRequired: true,
          errorMessage: 'Human decided to fix manually.',
          nextSteps: ['Manual debugging is required.'],
        };
      default:
        return {
          ...previousResult,
          success: false,
          humanInterventionRequired: true,
          errorMessage: 'Invalid human input. Manual fix required.',
          nextSteps: ['Manual debugging is required.'],
        };
    }
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

  // 타입 에러는 보통 낮은 심각도
  if ([ErrorType.TYPE_ERROR, ErrorType.VALIDATION_ERROR].includes(errorType)) {
    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM;
}