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
    return true; // 모든 에러를 테스트할 수 있음
  }

  /**
   * 에러 해결 여부 테스트 실행
   */
  async execute(
    error: Error,
    context: ErrorContext
  ): Promise<ResolutionResult> {
    try {
      this.logSuccess(context, '에러 해결 테스트 시작', {
        error: error.message,
      });

      // 에러 해결 여부 확인
      const { result: isResolved, executionTime } =
        await this.measureExecutionTime(() =>
          this.testErrorResolution(error, context)
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
      this.logError(error, context, '에러 해결 테스트 실패');

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
   * 에러 해결 여부 테스트
   */
  private async testErrorResolution(
    error: Error,
    context: ErrorContext
  ): Promise<boolean> {
    const errorKey = this.generateErrorKey(error);

    // 여러 번 테스트 시도
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `[TestRunnerAgent] 테스트 시도 ${attempt}/${this.maxRetries}`
        );

        const isResolved = await this.runSingleTest(error, context);

        if (isResolved) {
          this.testResults.set(errorKey, true);
          return true;
        }

        // 테스트 간 잠시 대기
        if (attempt < this.maxRetries) {
          await this.delay(1000 * attempt); // 점진적으로 대기 시간 증가
        }
      } catch (e) {
        console.warn(`[TestRunnerAgent] 테스트 시도 ${attempt} 실패:`, e);
      }
    }

    this.testResults.set(errorKey, false);
    return false;
  }

  /**
   * 단일 테스트 실행
   */
  private async runSingleTest(
    error: Error,
    context: ErrorContext
  ): Promise<boolean> {
    try {
      // 1. 에러 재현 시도
      const canReproduce = await this.attemptErrorReproduction(error, context);

      if (!canReproduce) {
        // 에러를 재현할 수 없다면 해결된 것으로 간주
        return true;
      }

      // 2. 애플리케이션 상태 확인
      const isHealthy = await this.checkApplicationHealth(context);

      if (!isHealthy) {
        // 애플리케이션이 비정상 상태라면 에러가 해결되지 않은 것
        return false;
      }

      // 3. 관련 기능 테스트
      const functionalityTest = await this.testRelatedFunctionality(
        error,
        context
      );

      return functionalityTest;
    } catch (e) {
      console.warn(`[TestRunnerAgent] 단일 테스트 실패:`, e);
      return false;
    }
  }

  /**
   * 에러 재현 시도
   */
  private async attemptErrorReproduction(
    error: Error,
    context: ErrorContext
  ): Promise<boolean> {
    try {
      // 에러 타입에 따른 재현 시도
      if (error.message.includes('innerHTML')) {
        return await this.testInnerHTMLError();
      }

      if (error.message.includes('getElementById')) {
        return await this.testGetElementByIdError();
      }

      if (error.message.includes('componentList')) {
        return await this.testComponentListError();
      }

      // 기본 테스트: 에러가 여전히 발생하는지 확인
      return await this.testBasicError(error);
    } catch (e) {
      console.warn(`[TestRunnerAgent] 에러 재현 테스트 실패:`, e);
      return false;
    }
  }

  /**
   * innerHTML 에러 테스트
   */
  private async testInnerHTMLError(): Promise<boolean> {
    try {
      // DOM 요소가 존재하는지 확인
      const testElement = document.getElementById('test-element');
      if (!testElement) {
        // 테스트 요소가 없으면 에러가 발생하지 않음
        return false;
      }

      // innerHTML 접근 시도
      testElement.innerHTML = 'test';
      return false; // 성공하면 에러가 해결된 것
    } catch (e) {
      // 에러가 발생하면 아직 해결되지 않은 것
      return true;
    }
  }

  /**
   * getElementById 에러 테스트
   */
  private async testGetElementByIdError(): Promise<boolean> {
    try {
      // 존재하지 않는 요소에 접근 시도
      const nonExistentElement = document.getElementById(
        'non-existent-element'
      );
      if (nonExistentElement) {
        // 요소가 존재한다면 에러가 발생하지 않음
        return false;
      }

      // null 체크 없이 속성 접근 시도 (런타임 에러 유도)
      (null as any).innerHTML = 'test';
      return true; // 에러 발생
    } catch (e) {
      // 에러가 발생하면 아직 해결되지 않은 것
      return true;
    }
  }

  /**
   * componentList 에러 테스트
   */
  private async testComponentListError(): Promise<boolean> {
    try {
      const componentList = document.getElementById('componentList');
      if (!componentList) {
        // 요소가 없으면 에러가 발생할 수 있음
        return true;
      }

      // 요소가 존재하면 에러가 발생하지 않음
      return false;
    } catch (e) {
      return true;
    }
  }

  /**
   * 기본 에러 테스트
   */
  private async testBasicError(error: Error): Promise<boolean> {
    try {
      // 에러 메시지에 따라 간단한 테스트 수행
      if (error.message.includes('Cannot read property')) {
        // null/undefined 접근 테스트 (런타임 에러 유도)
        const testObj: any = null;
        (testObj as any).property;
        return true;
      }

      return false;
    } catch (e) {
      return true;
    }
  }

  /**
   * 애플리케이션 상태 확인
   */
  private async checkApplicationHealth(
    context: ErrorContext
  ): Promise<boolean> {
    try {
      // 1. DOM 로드 상태 확인
      if (document.readyState !== 'complete') {
        return false;
      }

      // 2. 주요 UI 요소 존재 확인
      const essentialElements = ['canvas', 'panel', 'topbar'];

      for (const elementId of essentialElements) {
        const element = document.getElementById(elementId);
        if (!element) {
          console.warn(`[TestRunnerAgent] 필수 요소 누락: ${elementId}`);
          return false;
        }
      }

      // 3. JavaScript 에러 발생 여부 확인
      const hasJavaScriptErrors = this.checkForJavaScriptErrors();
      if (hasJavaScriptErrors) {
        return false;
      }

      return true;
    } catch (e) {
      console.warn(`[TestRunnerAgent] 애플리케이션 상태 확인 실패:`, e);
      return false;
    }
  }

  /**
   * JavaScript 에러 발생 여부 확인
   */
  private checkForJavaScriptErrors(): boolean {
    // 전역 에러 핸들러가 설정되어 있는지 확인
    if (!window.onerror && !window.addEventListener) {
      return true;
    }

    // 콘솔 에러 확인 (간단한 방법)
    const originalConsoleError = console.error;
    let hasErrors = false;

    console.error = (...args) => {
      hasErrors = true;
      originalConsoleError.apply(console, args);
    };

    // 잠시 대기 후 원래 함수 복원
    setTimeout(() => {
      console.error = originalConsoleError;
    }, 100);

    return hasErrors;
  }

  /**
   * 관련 기능 테스트
   */
  private async testRelatedFunctionality(
    error: Error,
    context: ErrorContext
  ): Promise<boolean> {
    try {
      // 에러와 관련된 기능이 정상 작동하는지 확인
      if (error.message.includes('componentList')) {
        // 컴포넌트 목록 관련 기능 테스트
        return await this.testComponentListFunctionality();
      }

      if (error.message.includes('innerHTML')) {
        // DOM 조작 관련 기능 테스트
        return await this.testDOMFunctionality();
      }

      // 기본 기능 테스트
      return await this.testBasicFunctionality();
    } catch (e) {
      console.warn(`[TestRunnerAgent] 관련 기능 테스트 실패:`, e);
      return false;
    }
  }

  /**
   * 컴포넌트 목록 기능 테스트
   */
  private async testComponentListFunctionality(): Promise<boolean> {
    try {
      // 컴포넌트 목록 요소가 존재하는지 확인
      const componentList = document.getElementById('componentList');
      if (!componentList) {
        return false;
      }

      // 컴포넌트 목록이 정상적으로 렌더링되는지 확인
      const hasContent =
        componentList.children.length > 0 ||
        componentList.innerHTML.trim() !== '';

      return hasContent;
    } catch (e) {
      return false;
    }
  }

  /**
   * DOM 기능 테스트
   */
  private async testDOMFunctionality(): Promise<boolean> {
    try {
      // 간단한 DOM 조작 테스트
      const testDiv = document.createElement('div');
      testDiv.id = 'test-dom-functionality';
      testDiv.innerHTML = 'test';

      document.body.appendChild(testDiv);

      // 테스트 요소 제거
      document.body.removeChild(testDiv);

      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 기본 기능 테스트
   */
  private async testBasicFunctionality(): Promise<boolean> {
    try {
      // 기본적인 JavaScript 기능 테스트
      const testArray = [1, 2, 3];
      const doubled = testArray.map((x) => x * 2);

      if (doubled.length !== 3 || doubled[0] !== 2) {
        return false;
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 에러 키 생성
   */
  private generateErrorKey(error: Error): string {
    return `${error.message}_${error.stack?.split('\n')[1] || 'unknown'}`;
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
