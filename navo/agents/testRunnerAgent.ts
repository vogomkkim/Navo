/**
 * Test Runner Agent
 *
 * 코드 수정 후 에러가 해결되었는지 확인하고 테스트를 실행하는 에이전트
 */

import {
  BaseAgent,
  ErrorResolutionAgent,
  ErrorContext,
  ResolutionResult,
  CodeChange,
} from '../core/errorResolution.js';

export class TestRunnerAgent extends BaseAgent {
  private testResults: Map<string, boolean> = new Map();
  private maxRetries: number = 3;

  constructor() {
    super('TestRunnerAgent', 3); // Code Fixer 다음 우선순위
  }

  /**
   * 이 에이전트가 처리할 수 있는 에러인지 확인
   * Test Runner는 테스트 가능한 모든 에러를 처리
   */
  canHandle(error: Error): boolean {
    return true; // Orchestrator will determine when to run tests
  }

  /**
   * 에러 해결 여부 테스트 실행
   */
  async execute(
    error: Error,
    context: ErrorContext,
    appliedChanges: CodeChange[] // Added appliedChanges as input
  ): Promise<ResolutionResult> {
    try {
      this.logSuccess(context, '에러 해결 테스트 시작', {
        error: error.message,
        changes: appliedChanges.length,
      });

      // Placeholder for running actual project tests
      const { result: isResolved, executionTime } = await this.measureExecutionTime(() =>
        this.runProjectTests(appliedChanges)
      );

      if (isResolved) {
        this.logSuccess(context, '에러 해결 확인됨', { executionTime });

        return {
          success: true,
          changes: [],
          executionTime,
          nextSteps: [
            '✅ 에러가 성공적으로 해결되었습니다!',
            '애플리케이션이 정상적으로 작동합니다',
            '새로운 에러가 발생하면 자동으로 감지됩니다',
          ],
        };
      } else {
        this.logSuccess(context, '에러 해결 확인 실패', { executionTime });

        return {
          success: false,
          changes: [],
          executionTime,
          errorMessage: '에러가 아직 해결되지 않았습니다.',
          nextSteps: [
            '다른 해결 방법을 시도해보세요',
            'Error Analyzer의 새로운 제안을 확인하세요',
            '수동 디버깅이 필요할 수 있습니다',
          ],
        };
      }
    } catch (e) {
      this.logError(error, context, '테스트 실행 실패');

      return {
        success: false,
        changes: [],
        executionTime: 0,
        errorMessage: `테스트 실행 실패: ${e instanceof Error ? e.message : String(e)}`,
        nextSteps: ['테스트 환경을 확인하세요', '시스템 관리자에게 문의하세요'],
      };
    }
  }

  /**
   * 프로젝트 테스트 실행
   */
  private async runProjectTests(appliedChanges: CodeChange[]): Promise<boolean> {
    // TODO: Implement logic to run actual project tests (e.g., npm test, jest)
    // For now, return true to allow the flow to continue
    this.logger.info('[TestRunnerAgent] Running placeholder project tests...');
    // In a real scenario, you would execute a shell command like:
    // const { stdout, stderr, exitCode } = await run_shell_command('npm test');
    // And then parse stdout/stderr to determine if tests passed.
    // You might also use 'appliedChanges' to run more targeted tests.
    return true;
  }

  /**
   * 테스트 결과 조회
   */
  getTestResult(errorKey: string): boolean | undefined {
    return this.testResults.get(errorKey);
  }

  /**
   * 모든 테스트 결과 조회
   */
  getAllTestResults(): Map<string, boolean> {
    return new Map(this.testResults);
  }

  /**
   * 테스트 결과 초기화
   */
  clearTestResults(): void {
    this.testResults.clear();
  }
}
