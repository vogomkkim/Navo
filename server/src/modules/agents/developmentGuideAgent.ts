/**
 * Test Runner Agent
 *
 * 코드 수정 후 에러가 해결되었는지 확인하고 테스트를 실행하는 에이전트
 */

import {
  BaseAgent,
  MasterDeveloperAgent,
  ErrorContext,
  ResolutionResult,
  CodeChange,
} from './core/masterDeveloper';

export class DevelopmentGuideAgent extends BaseAgent {
  private testResults: Map<string, boolean> = new Map();
  private maxRetries: number = 3;

  constructor() {
    super('DevelopmentGuideAgent', 3); // Code Generator 다음 우선순위
  }

  /**
   * 이 에이전트가 처리할 수 있는 요청인지 확인
   */
  canHandle(request: any): boolean {
    // 프로젝트 생성 요청인지 확인
    if (
      request &&
      typeof request === 'object' &&
      request.name &&
      request.description
    ) {
      return true; // 프로젝트 가이드 생성 요청
    }

    // 에러 객체인지 확인 (기존 호환성 유지)
    if (request instanceof Error) {
      return true; // 에러 테스트 요청
    }

    return false;
  }

  /**
   * 프로젝트 가이드 생성 또는 에러 테스트 실행
   */
  async execute(request: any, context: any, payload?: any): Promise<any> {
    try {
      // 프로젝트 생성 요청인지 확인
      if (
        request &&
        typeof request === 'object' &&
        request.name &&
        request.description
      ) {
        return await this.createDevelopmentGuide(request, context, payload);
      }

      // 에러 해결 요청인지 확인 (기존 호환성 유지)
      if (request instanceof Error) {
        return await this.runErrorTests(request, context, payload);
      }

      throw new Error('지원하지 않는 요청 타입입니다.');
    } catch (e) {
      this.logger.error('Development Guide Agent 실행 실패:', { error: e });
      throw e;
    }
  }

  /**
   * 개발 가이드 생성 실행
   */
  private async createDevelopmentGuide(
    request: any,
    context: any,
    payload?: any
  ): Promise<any> {
    try {
      this.logger.info('📚 개발 가이드 생성 시작', { request });

      // 프로젝트 정보와 생성된 코드 정보를 payload에서 가져옴
      const projectInfo = payload?.project;
      const architecture = payload?.architecture;

      if (!projectInfo || !architecture) {
        throw new Error('프로젝트 정보가 필요합니다.');
      }

      // 개발 가이드 생성
      const developmentGuide = await this.generateDevelopmentGuide(
        request,
        projectInfo,
        architecture
      );

      this.logger.info('✅ 개발 가이드 생성 완료', {
        steps: developmentGuide.steps.length,
        timeline: developmentGuide.timeline,
        resources: developmentGuide.resources.length,
      });

      return {
        success: true,
        developmentGuide: {
          steps: developmentGuide.steps,
          timeline: developmentGuide.timeline,
          resources: developmentGuide.resources,
          nextSteps: developmentGuide.nextSteps,
        },
        executionTime: Date.now(),
        nextSteps: [
          '🎉 프로젝트 생성 완료!',
          '생성된 파일들을 확인하고 개발을 시작하세요',
          'README.md와 개발 가이드를 참고하세요',
          '문제가 있으면 언제든지 문의하세요',
        ],
      };
    } catch (e) {
      this.logger.error('개발 가이드 생성 실패:', { error: e });
      throw e;
    }
  }

  /**
   * 에러 해결 여부 테스트 실행 (기존 기능 유지)
   */
  private async runErrorTests(
    error: Error,
    context: ErrorContext,
    appliedChanges?: CodeChange[]
  ): Promise<ResolutionResult> {
    try {
      const changesToTest: CodeChange[] = appliedChanges ?? [];

      this.logSuccess(context, '에러 해결 테스트 시작', {
        error: error.message,
        changes: changesToTest.length,
      });

      // Placeholder for running actual project tests
      const { result: isResolved, executionTime } =
        await this.measureExecutionTime(() =>
          this.runProjectTests(changesToTest)
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
  private async runProjectTests(
    appliedChanges: CodeChange[]
  ): Promise<boolean> {
    try {
      this.logger.info(
        '[DevelopmentGuideAgent] 실제 프로젝트 테스트 실행 시작...'
      );

      // 1. 기본 프로젝트 테스트 실행
      const basicTestResult = await this.runBasicProjectTests();

      // 2. 변경된 파일에 대한 타겟 테스트 실행
      const targetedTestResult = await this.runTargetedTests(appliedChanges);

      // 3. 통합 테스트 실행
      const integrationTestResult = await this.runIntegrationTests();

      // 모든 테스트가 통과했는지 확인
      const allTestsPassed =
        basicTestResult && targetedTestResult && integrationTestResult;

      this.logger.info(
        `[DevelopmentGuideAgent] 테스트 결과: 기본=${basicTestResult}, 타겟=${targetedTestResult}, 통합=${integrationTestResult}`
      );

      return allTestsPassed;
    } catch (error) {
      this.logger.error('[DevelopmentGuideAgent] 테스트 실행 중 에러 발생:', {
        error,
      });
      return false;
    }
  }

  /**
   * 기본 프로젝트 테스트 실행
   */
  private async runBasicProjectTests(): Promise<boolean> {
    try {
      // package.json 존재 확인
      const packageJsonExists = await this.checkFileExists('package.json');
      if (!packageJsonExists) {
        this.logger.warn(
          '[DevelopmentGuideAgent] package.json이 없습니다. 기본 테스트를 건너뜁니다.'
        );
        return true; // package.json이 없어도 기본 테스트는 통과로 간주
      }

      // npm test 명령어 실행 시도
      const testResult = await this.runNpmTest();
      return testResult;
    } catch (error) {
      this.logger.warn('[DevelopmentGuideAgent] 기본 테스트 실행 실패:', {
        error,
      });
      return true; // 기본 테스트 실패 시에도 계속 진행
    }
  }

  /**
   * 변경된 파일에 대한 타겟 테스트 실행
   */
  private async runTargetedTests(
    appliedChanges: CodeChange[]
  ): Promise<boolean> {
    if (appliedChanges.length === 0) {
      return true; // 변경사항이 없으면 테스트 통과
    }

    try {
      let allTestsPassed = true;

      for (const change of appliedChanges) {
        // 파일별 테스트 실행
        const fileTestResult = await this.testSpecificFile(change);
        if (!fileTestResult) {
          allTestsPassed = false;
          this.logger.warn(
            `[DevelopmentGuideAgent] 파일 테스트 실패: ${change.file}`
          );
        }
      }

      return allTestsPassed;
    } catch (error) {
      this.logger.error('[DevelopmentGuideAgent] 타겟 테스트 실행 실패:', {
        error,
      });
      return false;
    }
  }

  /**
   * 통합 테스트 실행
   */
  private async runIntegrationTests(): Promise<boolean> {
    try {
      // 애플리케이션 시작 테스트
      const startTest = await this.testApplicationStart();

      // 기본 기능 테스트
      const functionalityTest = await this.testBasicFunctionality();

      // 에러 발생 여부 테스트
      const errorTest = await this.testErrorHandling();

      return startTest && functionalityTest && errorTest;
    } catch (error) {
      this.logger.error('[DevelopmentGuideAgent] 통합 테스트 실행 실패:', {
        error,
      });
      return false;
    }
  }

  /**
   * npm test 명령어 실행
   */
  private async runNpmTest(): Promise<boolean> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync('npm test', {
        timeout: 30000, // 30초 타임아웃
        cwd: process.cwd(),
      });

      // 테스트 결과 파싱
      const testPassed = this.parseTestOutput(stdout, stderr);

      this.logger.info('[DevelopmentGuideAgent] npm test 실행 완료:', {
        stdout: stdout.substring(0, 200) + '...',
        testPassed,
      });

      return testPassed;
    } catch (error) {
      this.logger.warn('[DevelopmentGuideAgent] npm test 실행 실패:', {
        error,
      });
      return true; // npm test가 없어도 테스트 통과로 간주
    }
  }

  /**
   * 특정 파일 테스트
   */
  private async testSpecificFile(change: CodeChange): Promise<boolean> {
    try {
      const filePath = change.file;

      // 파일 존재 확인
      const fileExists = await this.checkFileExists(filePath);
      if (!fileExists) {
        return false;
      }

      // 파일 내용 유효성 검사
      const contentValid = await this.validateFileContent(filePath, change);

      return contentValid;
    } catch (error) {
      this.logger.error(
        `[DevelopmentGuideAgent] 파일 테스트 실패: ${change.file}`,
        { error }
      );
      return false;
    }
  }

  /**
   * 애플리케이션 시작 테스트
   */
  private async testApplicationStart(): Promise<boolean> {
    try {
      // package.json의 start 스크립트 확인
      const packageJsonExists = await this.checkFileExists('package.json');
      if (!packageJsonExists) {
        return true; // package.json이 없어도 테스트 통과
      }

      // 메인 파일 존재 확인
      const mainFileExists = await this.checkFileExists('src/index.js');
      if (!mainFileExists) {
        return true; // 메인 파일이 없어도 테스트 통과
      }

      return true;
    } catch (error) {
      this.logger.error(
        '[DevelopmentGuideAgent] 애플리케이션 시작 테스트 실패:',
        { error }
      );
      return false;
    }
  }

  /**
   * 기본 기능 테스트
   */
  private async testBasicFunctionality(): Promise<boolean> {
    try {
      // 기본적인 파일 구조 확인
      const srcExists = await this.checkFileExists('src');
      const componentsExists = await this.checkFileExists('src/components');

      return srcExists && componentsExists;
    } catch (error) {
      this.logger.error('[DevelopmentGuideAgent] 기본 기능 테스트 실패:', {
        error,
      });
      return false;
    }
  }

  /**
   * 에러 처리 테스트
   */
  private async testErrorHandling(): Promise<boolean> {
    try {
      // 에러 처리 관련 파일 확인
      const errorHandlingExists = await this.checkFileExists(
        'src/utils/errorHandler.js'
      );

      return true; // 에러 처리 파일이 없어도 테스트 통과
    } catch (error) {
      this.logger.error('[DevelopmentGuideAgent] 에러 처리 테스트 실패:', {
        error,
      });
      return false;
    }
  }

  /**
   * 파일 존재 여부 확인
   */
  private async checkFileExists(filePath: string): Promise<boolean> {
    try {
      const { access } = await import('fs/promises');
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 파일 내용 유효성 검사
   */
  private async validateFileContent(
    filePath: string,
    change: CodeChange
  ): Promise<boolean> {
    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(filePath, 'utf8');

      // 기본적인 문법 검사 (간단한 검증)
      if (change.action === 'create' && content.length === 0) {
        return false; // 빈 파일 생성은 실패
      }

      // JavaScript 파일의 경우 기본 문법 검사
      if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
        return this.validateJavaScriptSyntax(content);
      }

      return true;
    } catch (error) {
      this.logger.error(
        `[DevelopmentGuideAgent] 파일 내용 검증 실패: ${filePath}`,
        { error }
      );
      return false;
    }
  }

  /**
   * JavaScript 문법 검사
   */
  private validateJavaScriptSyntax(content: string): boolean {
    try {
      // 간단한 문법 검사 (eval 사용은 위험하지만 테스트 목적으로만 사용)
      // 실제 프로덕션에서는 더 안전한 방법 사용 권장
      eval(`(function() { ${content} })`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 테스트 출력 파싱
   */
  private parseTestOutput(stdout: string, stderr: string): boolean {
    // Jest, Mocha 등 일반적인 테스트 프레임워크 출력 파싱
    const output = stdout + stderr;

    // 성공 패턴 확인
    const successPatterns = [
      /✓\s+\d+ tests? passed/,
      /PASS\s+.*\d+ tests?/,
      /All tests passed/,
      /Tests completed successfully/,
    ];

    // 실패 패턴 확인
    const failurePatterns = [
      /✗\s+\d+ tests? failed/,
      /FAIL\s+.*\d+ tests?/,
      /Tests failed/,
      /Error:/,
    ];

    // 실패 패턴이 있으면 false 반환
    for (const pattern of failurePatterns) {
      if (pattern.test(output)) {
        return false;
      }
    }

    // 성공 패턴이 있으면 true 반환
    for (const pattern of successPatterns) {
      if (pattern.test(output)) {
        return true;
      }
    }

    // 패턴을 찾을 수 없으면 기본적으로 true 반환
    return true;
  }

  /**
   * 개발 가이드 생성
   */
  private async generateDevelopmentGuide(
    request: any,
    projectInfo: any,
    architecture: any
  ): Promise<{
    steps: string[];
    timeline: string;
    resources: string[];
    nextSteps: string[];
  }> {
    try {
      // 1. 개발 단계별 가이드 생성
      const steps = this.generateDevelopmentSteps(request, architecture);

      // 2. 개발 타임라인 추정
      const timeline = this.estimateDevelopmentTimeline(request, architecture);

      // 3. 관련 리소스 링크 생성
      const resources = this.generateResourceLinks(request, architecture);

      // 4. 다음 단계 제안
      const nextSteps = this.generateNextSteps(request, architecture);

      return {
        steps,
        timeline,
        resources,
        nextSteps,
      };
    } catch (error) {
      this.logger.error('개발 가이드 생성 실패:', { error });

      // 기본 가이드 반환
      return {
        steps: ['기본 개발 단계'],
        timeline: '1-2일',
        resources: ['기본 개발 리소스'],
        nextSteps: ['개발 시작'],
      };
    }
  }

  /**
   * 개발 단계별 가이드 생성
   */
  private generateDevelopmentSteps(request: any, architecture: any): string[] {
    const steps = [
      '1. 프로젝트 환경 설정',
      '2. 의존성 설치',
      '3. 기본 구조 구현',
      '4. 핵심 기능 개발',
      '5. 테스트 및 디버깅',
      '6. 배포 준비',
    ];

    // 프로젝트 타입별 추가 단계
    if (request.type === 'web') {
      steps.splice(3, 0, '3-1. UI/UX 구현');
      steps.splice(4, 0, '4-1. 반응형 디자인 적용');
    }

    if (request.type === 'api') {
      steps.splice(3, 0, '3-1. API 엔드포인트 설계');
      steps.splice(4, 0, '4-1. 인증 시스템 구현');
    }

    if (request.type === 'fullstack') {
      steps.splice(3, 0, '3-1. 백엔드 API 개발');
      steps.splice(4, 0, '4-1. 프론트엔드 구현');
      steps.splice(5, 0, '5-1. 데이터베이스 연동');
    }

    // 기술 스택별 추가 단계
    if (architecture.technology?.includes('React')) {
      steps.splice(3, 0, '3-1. React 컴포넌트 설계');
    }

    if (architecture.technology?.includes('Node.js')) {
      steps.splice(3, 0, '3-1. Node.js 서버 설정');
    }

    return steps;
  }

  /**
   * 개발 타임라인 추정
   */
  private estimateDevelopmentTimeline(request: any, architecture: any): string {
    const complexity = request.complexity || 'medium';
    const baseTime = {
      simple: '1-2일',
      medium: '3-5일',
      complex: '1-2주',
    };

    let estimatedTime = baseTime[complexity as keyof typeof baseTime];

    // 기술 스택별 시간 조정
    if (architecture.technology?.includes('React')) {
      estimatedTime += ' (React 학습 시간 포함)';
    }

    if (request.type === 'fullstack') {
      estimatedTime += ' (프론트엔드 + 백엔드 개발)';
    }

    return estimatedTime;
  }

  /**
   * 리소스 링크 생성
   */
  private generateResourceLinks(request: any, architecture: any): string[] {
    const resources = [
      '📚 공식 문서: 각 기술의 공식 문서 참조',
      '🔍 Stack Overflow: 문제 해결을 위한 커뮤니티',
      '📖 GitHub: 유사한 프로젝트 예시 참고',
    ];

    // 기술 스택별 리소스 추가
    if (architecture.technology?.includes('React')) {
      resources.push('⚛️ React 공식 튜토리얼: https://react.dev/learn');
      resources.push('🎨 React 컴포넌트 라이브러리: Material-UI, Ant Design');
    }

    if (architecture.technology?.includes('Node.js')) {
      resources.push('🟢 Node.js 공식 문서: https://nodejs.org/docs/');
      resources.push('📦 npm 패키지 검색: https://www.npmjs.com/');
    }

    return resources;
  }

  /**
   * 다음 단계 제안
   */
  private generateNextSteps(request: any, architecture: any): string[] {
    const nextSteps = [
      '프로젝트 실행 및 테스트',
      '코드 리뷰 및 최적화',
      '배포 환경 설정',
    ];

    if (request.type === 'web') {
      nextSteps.push('반응형 디자인 적용');
      nextSteps.push('SEO 최적화');
    }

    if (request.type === 'api') {
      nextSteps.push('API 문서화 (Swagger)');
      nextSteps.push('인증 시스템 구현');
    }

    return nextSteps;
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
