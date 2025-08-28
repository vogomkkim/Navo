/**
 * Master Developer Agent
 *
 * 프로젝트 생성 요청을 분석하고 다른 에이전트들을 조율하는 메인 에이전트
 */

import { BaseAgent, ProjectRequest } from "../core/masterDeveloper.js";
import { ProjectArchitectAgent } from "./projectArchitectAgent.js";
import { ProjectDatabaseManagerAgent } from "./projectDatabaseManagerAgent.js";

export interface ProjectPlan {
  project: {
    name: string;
    file_structure: any;
  };
  draftId: string; // Add draftId to the return plan
  estimatedTime: string;
  difficulty: string;
  nextSteps: string[];
}

export class MasterDeveloperAgent extends BaseAgent {
  private architectAgent: ProjectArchitectAgent;
  private dbManager: ProjectDatabaseManagerAgent;

  constructor() {
    super("MasterDeveloperAgent", 0); // 최고 우선순위

    this.architectAgent = new ProjectArchitectAgent();
    this.dbManager = new ProjectDatabaseManagerAgent(); // Initialize the DB manager
  }

  canHandle(request: any): boolean {
    return (
      request &&
      typeof request === "object" &&
      request.name &&
      request.description &&
      request.type &&
      request.features
    );
  }

  async execute(request: any, context: any): Promise<any> {
    if (this.canHandle(request)) {
      return this.createProject(request);
    } else {
      throw new Error("MasterDeveloperAgent cannot handle this request.");
    }
  }

  /**
   * 프로젝트 생성 요청을 처리
   */
  async createProject(request: ProjectRequest): Promise<ProjectPlan> {
    try {
      this.logger.info("🚀 Master Developer 프로젝트 생성 시작", { request });

      // Project Architect Agent로 완전한 프로젝트 구조 생성
      this.logger.info("🏗️ Project Architect Agent 호출 중...");
      const projectResult = await this.architectAgent.execute(request, {});

      // Project Architect Agent가 반환하는 구조에서 project 객체 추출
      const project =
        projectResult.architecture?.project || projectResult.project;

      if (!project || !project.file_structure) {
        throw new Error(
          "Project Architect Agent가 올바른 프로젝트 구조를 반환하지 않았습니다."
        );
      }

      // 생성된 프로젝트 구조를 데이터베이스에 초안으로 저장
      // 참고: 실제 projectId는 컨텍스트에서 가져와야 합니다. 여기서는 임시 ID를 사용합니다.
      const tempProjectId = "_temp_project_id_"; // This should be replaced with actual project ID logic
      const draft = await this.dbManager.saveDraft(
        tempProjectId,
        `Initial draft for ${project.name}`,
        project
      );

      // 프로젝트 계획 조합
      const projectPlan: ProjectPlan = {
        project,
        draftId: draft.id, // Return the draftId
        estimatedTime: this.calculateEstimatedTime(project),
        difficulty: this.assessDifficulty(project),
        nextSteps: this.generateNextSteps(draft.id),
      };

      this.logger.info("✅ Master Developer 프로젝트 생성 완료", {
        projectName: project.name,
        fileCount: this.countFiles(project.file_structure),
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
   * 파일 수 계산 헬퍼 메서드
   */
  private countFiles(fileStructure: any): number {
    let count = 0;

    function traverse(node: any): void {
      if (node.type === "file") {
        count++;
      } else if (node.type === "folder" && node.children) {
        node.children.forEach((child: any) => traverse(child));
      }
    }

    traverse(fileStructure);
    return count;
  }

  /**
   * 예상 개발 시간 계산
   */
  private calculateEstimatedTime(project: any): string {
    // 파일 수와 복잡도를 기반으로 시간 계산
    const fileCount = this.countFiles(project.file_structure);
    const baseTime = 20; // 기본 20시간
    const fileMultiplier = Math.max(1, fileCount / 10); // 파일 수에 따른 배수
    const estimatedHours = Math.ceil(baseTime * fileMultiplier);

    if (estimatedHours < 40)
      return `${estimatedHours}시간 (약 ${Math.ceil(estimatedHours / 8)}일)`;
    return `${estimatedHours}시간 (약 ${Math.ceil(estimatedHours / 8)}일)`;
  }

  /**
   * 프로젝트 난이도 평가
   */
  private assessDifficulty(project: any): string {
    const fileCount = this.countFiles(project.file_structure);

    if (fileCount > 20) return "고급";
    if (fileCount > 10) return "중급";
    return "초급";
  }

  /**
   * 다음 단계 생성
   */
  private generateNextSteps(draftId: string): string[] {
    return [
      `프로젝트 초안이 데이터베이스에 저장되었습니다 (Draft ID: ${draftId}).`,
      `미리보기 URL: /api/preview/${draftId}/src/index.html`,
      "가상 프로젝트 구조를 기반으로 실제 파일 생성",
      "package.json의 의존성 설치",
      "개발 서버 실행 및 테스트",
    ];
  }
}
