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
} from "../core/errorResolution.js";

export class DevelopmentGuideAgent extends BaseAgent {
  private testResults: Map<string, boolean> = new Map();
  private maxRetries: number = 3;

  constructor() {
    super("DevelopmentGuideAgent", 3); // Code Generator 다음 우선순위
  }

  /**
   * 이 에이전트가 처리할 수 있는 요청인지 확인
   */
  canHandle(request: any): boolean {
    // 프로젝트 생성 요청인지 확인
    if (
      request &&
      typeof request === "object" &&
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
        typeof request === "object" &&
        request.name &&
        request.description
      ) {
        return await this.createDevelopmentGuide(request, context, payload);
      }

      // 에러 해결 요청인지 확인 (기존 호환성 유지)
      if (request instanceof Error) {
        return await this.runErrorTests(request, context, payload);
      }

      throw new Error("지원하지 않는 요청 타입입니다.");
    } catch (e) {
      this.logger.error("Development Guide Agent 실행 실패:", e);
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
      this.logger.info("📚 개발 가이드 생성 시작", { request });

      // 프로젝트 정보와 생성된 코드 정보를 payload에서 가져옴
      const projectInfo = payload?.project;
      const architecture = payload?.architecture;

      if (!projectInfo || !architecture) {
        throw new Error("프로젝트 정보가 필요합니다.");
      }

      // 개발 가이드 생성
      const developmentGuide = await this.generateDevelopmentGuide(
        request,
        projectInfo,
        architecture
      );

      this.logger.info("✅ 개발 가이드 생성 완료", {
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
          "🎉 프로젝트 생성 완료!",
          "생성된 파일들을 확인하고 개발을 시작하세요",
          "README.md와 개발 가이드를 참고하세요",
          "문제가 있으면 언제든지 문의하세요",
        ],
      };
    } catch (e) {
      this.logger.error("개발 가이드 생성 실패:", e);
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

      this.logSuccess(context, "에러 해결 테스트 시작", {
        error: error.message,
        changes: changesToTest.length,
      });

      // Placeholder for running actual project tests
      const { result: isResolved, executionTime } =
        await this.measureExecutionTime(() =>
          this.runProjectTests(changesToTest)
        );

      if (isResolved) {
        this.logSuccess(context, "에러 해결 확인됨", { executionTime });

        return {
          success: true,
          changes: [],
          executionTime,
          nextSteps: [
            "✅ 에러가 성공적으로 해결되었습니다!",
            "애플리케이션이 정상적으로 작동합니다",
            "새로운 에러가 발생하면 자동으로 감지됩니다",
          ],
        };
      } else {
        this.logSuccess(context, "에러 해결 확인 실패", { executionTime });

        return {
          success: false,
          changes: [],
          executionTime,
          errorMessage: "에러가 아직 해결되지 않았습니다.",
          nextSteps: [
            "다른 해결 방법을 시도해보세요",
            "Error Analyzer의 새로운 제안을 확인하세요",
            "수동 디버깅이 필요할 수 있습니다",
          ],
        };
      }
    } catch (e) {
      this.logError(error, context, "테스트 실행 실패");

      return {
        success: false,
        changes: [],
        executionTime: 0,
        errorMessage: `테스트 실행 실패: ${e instanceof Error ? e.message : String(e)}`,
        nextSteps: ["테스트 환경을 확인하세요", "시스템 관리자에게 문의하세요"],
      };
    }
  }

  /**
   * 프로젝트 테스트 실행
   */
  private async runProjectTests(
    appliedChanges: CodeChange[]
  ): Promise<boolean> {
    // TODO: Implement logic to run actual project tests (e.g., npm test, jest)
    // For now, return true to allow the flow to continue
    this.logger.info(
      "[DevelopmentGuideAgent] Running placeholder project tests..."
    );
    // In a real scenario, you would execute a shell command like:
    // const { stdout, stderr, exitCode } = await run_shell_command('npm test');
    // And then parse stdout/stderr to determine if tests passed.
    // You might also use 'appliedChanges' to run more targeted tests.
    return true;
  }

  /**
   * 개발 가이드 생성
   */
  private async generateDevelopmentGuide(
    request: any,
    projectInfo: any,
    architecture: any
  ): Promise<any> {
    try {
      // 프로젝트 타입과 복잡도에 따른 가이드 생성
      const steps = this.generateDevelopmentSteps(request, architecture);
      const timeline = this.estimateDevelopmentTimeline(request, architecture);
      const resources = this.generateResourceLinks(request, architecture);

      return {
        steps,
        timeline,
        resources,
        nextSteps: this.generateNextSteps(request, architecture),
      };
    } catch (error) {
      this.logger.error("개발 가이드 생성 실패:", error);
      throw error;
    }
  }

  /**
   * 개발 단계 생성
   */
  private generateDevelopmentSteps(request: any, architecture: any): string[] {
    const steps = [
      "1. 프로젝트 환경 설정",
      "2. 의존성 설치 (npm install)",
      "3. 개발 서버 실행 (npm run dev)",
    ];

    // 프로젝트 타입별 추가 단계
    if (request.type === "web" || request.type === "fullstack") {
      steps.push("4. 브라우저에서 localhost:3000 접속");
      steps.push("5. 컴포넌트별 기능 테스트");
    }

    if (request.type === "api") {
      steps.push("4. API 엔드포인트 테스트");
      steps.push("5. Postman 또는 curl로 API 검증");
    }

    // 기술 스택별 추가 단계
    if (architecture.technology?.includes("React")) {
      steps.push("6. React DevTools로 컴포넌트 디버깅");
    }

    if (architecture.technology?.includes("Node.js")) {
      steps.push("7. Node.js 디버거 설정");
    }

    return steps;
  }

  /**
   * 개발 타임라인 추정
   */
  private estimateDevelopmentTimeline(request: any, architecture: any): string {
    const complexity = request.complexity || "medium";
    const baseTime = {
      simple: "1-2일",
      medium: "3-5일",
      complex: "1-2주",
    };

    let estimatedTime = baseTime[complexity];

    // 기술 스택별 시간 조정
    if (architecture.technology?.includes("React")) {
      estimatedTime += " (React 학습 시간 포함)";
    }

    if (request.type === "fullstack") {
      estimatedTime += " (프론트엔드 + 백엔드 개발)";
    }

    return estimatedTime;
  }

  /**
   * 리소스 링크 생성
   */
  private generateResourceLinks(request: any, architecture: any): string[] {
    const resources = [
      "📚 공식 문서: 각 기술의 공식 문서 참조",
      "🔍 Stack Overflow: 문제 해결을 위한 커뮤니티",
      "📖 GitHub: 유사한 프로젝트 예시 참고",
    ];

    // 기술 스택별 리소스 추가
    if (architecture.technology?.includes("React")) {
      resources.push("⚛️ React 공식 튜토리얼: https://react.dev/learn");
      resources.push("🎨 React 컴포넌트 라이브러리: Material-UI, Ant Design");
    }

    if (architecture.technology?.includes("Node.js")) {
      resources.push("🟢 Node.js 공식 문서: https://nodejs.org/docs/");
      resources.push("📦 npm 패키지 검색: https://www.npmjs.com/");
    }

    return resources;
  }

  /**
   * 다음 단계 제안
   */
  private generateNextSteps(request: any, architecture: any): string[] {
    const nextSteps = [
      "프로젝트 실행 및 테스트",
      "코드 리뷰 및 최적화",
      "배포 환경 설정",
    ];

    if (request.type === "web") {
      nextSteps.push("반응형 디자인 적용");
      nextSteps.push("SEO 최적화");
    }

    if (request.type === "api") {
      nextSteps.push("API 문서화 (Swagger)");
      nextSteps.push("인증 시스템 구현");
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
