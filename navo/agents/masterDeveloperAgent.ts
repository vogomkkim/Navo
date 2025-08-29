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
  estimatedTime: string;
  difficulty: string;
  nextSteps: string[];
  projectId: string;
  pages: any[];
  components: any[];
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
      return this.createProject(request, context);
    } else {
      throw new Error("MasterDeveloperAgent cannot handle this request.");
    }
  }

  /**
   * 프로젝트 생성 요청을 처리
   */
  async createProject(
    request: ProjectRequest,
    context: any
  ): Promise<ProjectPlan> {
    try {
      this.logger.info("🚀 Master Developer 프로젝트 생성 시작", { request });

      const userId = context.userId;
      if (!userId) {
        throw new Error("사용자 ID가 제공되지 않았습니다.");
      }

      // 1단계: 기본 프로젝트 정보 생성
      this.logger.info("📝 1단계: 기본 프로젝트 정보 생성");
      const basicProject = {
        name: request.name,
        description:
          request.description || `AI가 생성한 ${request.name} 프로젝트`,
        type: request.type || "web",
      };

      this.logger.info("✅ 1단계 완료: 기본 프로젝트 정보", { basicProject });

      // 2단계: AI 아키텍처 설계 시도
      this.logger.info("🏗️ 2단계: AI 아키텍처 설계 시작");
      let projectArchitecture;
      try {
        const architectResult = await this.architectAgent.execute(request, {});
        projectArchitecture =
          architectResult.architecture?.project || architectResult.project;

        if (!projectArchitecture || !projectArchitecture.file_structure) {
          throw new Error(
            "Project Architect Agent가 올바른 프로젝트 구조를 반환하지 않았습니다."
          );
        }

        this.logger.info("✅ 2단계 완료: AI 아키텍처 설계 성공", {
          fileCount: this.countFiles(projectArchitecture.file_structure),
          pages: projectArchitecture.pages?.length || 0,
          components: projectArchitecture.components?.length || 0,
        });
      } catch (architectError) {
        this.logger.warn("⚠️ 2단계 실패, 기본 구조 사용", {
          error: architectError,
        });

        // 기본 구조로 폴백
        projectArchitecture = {
          name: basicProject.name,
          file_structure: {
            type: "folder",
            name: basicProject.name,
            children: [
              {
                type: "file",
                name: "package.json",
                content: JSON.stringify(
                  {
                    name: basicProject.name,
                    version: "1.0.0",
                    description: basicProject.description,
                    main: "index.js",
                    scripts: { start: "node index.js" },
                  },
                  null,
                  2
                ),
              },
              {
                type: "file",
                name: "README.md",
                content: `# ${basicProject.name}\n\n${basicProject.description}\n\n## 시작하기\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\``,
              },
            ],
          },
          pages: [
            {
              name: "Home",
              path: "/",
              description: "메인 페이지",
              type: "page",
            },
          ],
          components: [
            {
              name: "Header",
              type: "layout",
              description: "페이지 헤더",
              props: ["title"],
            },
          ],
        };

        this.logger.info("✅ 2단계 폴백: 기본 구조 생성 완료", {
          fileCount: this.countFiles(projectArchitecture.file_structure),
        });
      }

      // 3단계: 데이터베이스에 프로젝트 생성
      this.logger.info("💾 3단계: 데이터베이스에 프로젝트 저장");
      const createdProject = await this.dbManager.createProject({
        name: basicProject.name,
        description: basicProject.description,
        ownerId: userId,
        type: basicProject.type,
      });

      if (!createdProject || !createdProject.id) {
        throw new Error("프로젝트 생성에 실패했습니다.");
      }

      this.logger.info("✅ 3단계 완료: 프로젝트 저장", {
        projectId: createdProject.id,
        projectName: createdProject.name,
      });

      // 4단계: Pages 직접 생성
      this.logger.info("📄 4단계: Pages 직접 생성");
      const createdPages = await this.dbManager.createPagesFromArchitecture(
        createdProject.id,
        projectArchitecture
      );

      this.logger.info("✅ 4단계 완료: Pages 생성", {
        pagesCount: createdPages.length,
        projectId: createdProject.id,
      });

      // 5단계: Component Definitions 직접 생성
      this.logger.info("🧩 5단계: Component Definitions 직접 생성");
      const createdComponentDefs =
        await this.dbManager.createComponentDefinitionsFromArchitecture(
          createdProject.id,
          projectArchitecture
        );

      this.logger.info("✅ 5단계 완료: Component Definitions 생성", {
        componentsCount: createdComponentDefs.length,
        projectId: createdProject.id,
      });

      // 6단계: Components 직접 생성 (pages에 연결)
      this.logger.info("🔧 6단계: Components 직접 생성");
      let allCreatedComponents: any[] = [];
      for (const page of createdPages) {
        const pageComponents =
          await this.dbManager.createComponentsFromArchitecture(
            createdProject.id,
            page.id,
            projectArchitecture
          );
        allCreatedComponents = allCreatedComponents.concat(pageComponents);
      }

      this.logger.info("✅ 6단계 완료: Components 생성", {
        componentsCount: allCreatedComponents.length,
        projectId: createdProject.id,
      });

      // 7단계: 프로젝트 계획 생성
      this.logger.info("📋 7단계: 프로젝트 계획 생성");
      const projectPlan: ProjectPlan = {
        project: projectArchitecture,
        projectId: createdProject.id,
        pages: createdPages,
        components: allCreatedComponents,
        estimatedTime: this.calculateEstimatedTime(projectArchitecture),
        difficulty: this.assessDifficulty(projectArchitecture),
        nextSteps: this.generateNextSteps(
          createdProject.id,
          createdPages,
          allCreatedComponents
        ),
      };

      this.logger.info("✅ 7단계 완료: 프로젝트 계획 생성", {
        estimatedTime: projectPlan.estimatedTime,
        difficulty: projectPlan.difficulty,
        nextStepsCount: projectPlan.nextSteps.length,
      });

      // 전체 프로젝트 생성 완료
      this.logger.info("🎉 Master Developer 프로젝트 생성 완료!", {
        projectName: basicProject.name,
        projectId: createdProject.id,
        totalFiles: this.countFiles(projectArchitecture.file_structure),
        totalPages: createdPages.length,
        totalComponents: allCreatedComponents.length,
        isFallback:
          !projectArchitecture.file_structure.children ||
          projectArchitecture.file_structure.children.length <= 2,
        executionSteps: [
          "기본 프로젝트 정보 생성",
          "AI 아키텍처 설계",
          "데이터베이스 저장",
          "Pages 직접 생성",
          "Component Definitions 직접 생성",
          "Components 직접 생성",
          "프로젝트 계획 생성",
        ],
      });

      return projectPlan;
    } catch (error) {
      this.logger.error("❌ Master Developer 프로젝트 생성 실패", { error });

      // 최종 폴백: 사용자에게 기본 정보라도 제공
      const fallbackProject = {
        name: request.name,
        description:
          request.description || "프로젝트 생성 중 오류가 발생했습니다.",
        type: request.type || "web",
      };

      this.logger.info("🔄 최종 폴백 프로젝트 정보 생성", { fallbackProject });

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
  private generateNextSteps(
    projectId: string,
    pages: any[],
    components: any[]
  ): string[] {
    return [
      `프로젝트 ID: ${projectId}`,
      `미리보기 URL: /api/preview/${projectId}/src/index.html`,
      "가상 프로젝트 구조를 기반으로 실제 파일 생성",
      "package.json의 의존성 설치",
      "개발 서버 실행 및 테스트",
    ];
  }
}
