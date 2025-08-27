/**
 * Master Developer Agent
 *
 * 프로젝트 생성 요청을 분석하고 다른 에이전트들을 조율하는 메인 에이전트
 */

import { BaseAgent } from "./baseAgent.js";
import { ProjectArchitectAgent } from "./projectArchitectAgent.js";
import { UIUXDesignerAgent } from "./uiuxDesignerAgent.js";
import { CodeGeneratorAgent } from "./codeGeneratorAgent.js";
import { DevelopmentGuideAgent } from "./developmentGuideAgent.js";

export interface ProjectRequest {
  description: string;
  context?: {
    projectType?: string;
    targetAudience?: string;
    features?: string[];
    technology?: string[];
    complexity?: "simple" | "medium" | "complex";
  };
}

export interface ProjectPlan {
  architecture: any;
  uiDesign: any;
  codeStructure: any;
  developmentGuide: any;
  estimatedTime: string;
  difficulty: string;
  nextSteps: string[];
}

export class MasterDeveloperAgent extends BaseAgent {
  private architectAgent: ProjectArchitectAgent;
  private designerAgent: UIUXDesignerAgent;
  private generatorAgent: CodeGeneratorAgent;
  private guideAgent: DevelopmentGuideAgent;

  constructor() {
    super("MasterDeveloperAgent", 0); // 최고 우선순위

    // 하위 에이전트들 초기화
    this.architectAgent = new ProjectArchitectAgent();
    this.designerAgent = new UIUXDesignerAgent();
    this.generatorAgent = new CodeGeneratorAgent();
    this.guideAgent = new DevelopmentGuideAgent();
  }

  /**
   * 프로젝트 생성 요청을 처리
   */
  async createProject(request: ProjectRequest): Promise<ProjectPlan> {
    try {
      this.logger.info("🚀 Master Developer 프로젝트 생성 시작", { request });

      // 1단계: Project Architect Agent로 아키텍처 설계
      this.logger.info("🏗️ Project Architect Agent 호출 중...");
      const architecture =
        await this.architectAgent.designArchitecture(request);

      // 2단계: UI/UX Designer Agent로 인터페이스 설계
      this.logger.info("🎨 UI/UX Designer Agent 호출 중...");
      const uiDesign = await this.designerAgent.designInterface(
        request,
        architecture
      );

      // 3단계: Code Generator Agent로 코드 구조 생성
      this.logger.info("⚡ Code Generator Agent 호출 중...");
      const codeStructure = await this.generatorAgent.generateCode(
        request,
        architecture,
        uiDesign
      );

      // 4단계: Development Guide Agent로 개발 가이드 작성
      this.logger.info("📚 Development Guide Agent 호출 중...");
      const developmentGuide = await this.guideAgent.createGuide(
        request,
        architecture,
        uiDesign,
        codeStructure
      );

      // 전체 프로젝트 계획 조합
      const projectPlan: ProjectPlan = {
        architecture,
        uiDesign,
        codeStructure,
        developmentGuide,
        estimatedTime: this.calculateEstimatedTime(architecture, codeStructure),
        difficulty: this.assessDifficulty(architecture, codeStructure),
        nextSteps: this.generateNextSteps(developmentGuide),
      };

      this.logger.info("✅ Master Developer 프로젝트 생성 완료", {
        projectPlan,
      });

      return projectPlan;
    } catch (error) {
      this.logger.error("❌ Master Developer 프로젝트 생성 실패", { error });
      throw new Error(
        `프로젝트 생성 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 예상 개발 시간 계산
   */
  private calculateEstimatedTime(
    architecture: any,
    codeStructure: any
  ): string {
    // 실제로는 아키텍처와 코드 구조를 분석하여 계산
    const baseTime = 40; // 기본 40시간
    const complexityMultiplier = architecture.complexity === "complex" ? 2 : 1;
    const estimatedHours = baseTime * complexityMultiplier;

    if (estimatedHours < 80)
      return `${estimatedHours}시간 (약 ${Math.ceil(estimatedHours / 8)}일)`;
    return `${estimatedHours}시간 (약 ${Math.ceil(estimatedHours / 8)}일)`;
  }

  /**
   * 프로젝트 난이도 평가
   */
  private assessDifficulty(architecture: any, codeStructure: any): string {
    if (architecture.complexity === "complex") return "고급";
    if (architecture.complexity === "medium") return "중급";
    return "초급";
  }

  /**
   * 다음 단계 생성
   */
  private generateNextSteps(developmentGuide: any): string[] {
    return [
      "프로젝트 파일 생성 및 초기 설정",
      "개발 환경 구성",
      "첫 번째 기능 구현",
      "테스트 및 디버깅",
      "배포 준비",
    ];
  }
}
