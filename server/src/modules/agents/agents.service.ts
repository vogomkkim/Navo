import { FastifyInstance } from 'fastify';
import { MasterDeveloperAgent, ProjectPlan } from './masterDeveloperAgent';
import { VirtualPreviewGeneratorAgent } from './virtualPreviewGeneratorAgent';
import { ProjectRequest } from './core/masterDeveloper';
import { AgentsRepository, ProjectPlanData, VirtualPreviewData } from './agents.repository';

export interface GenerateProjectPlanContext {
  userId?: string;
  projectId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  [key: string]: unknown;
}

export class AgentsService {
  private repository: AgentsRepository;

  constructor(private readonly app: FastifyInstance) {
    this.repository = new AgentsRepository(app);
  }

  async generateProjectPlan(
    request: ProjectRequest,
    context: GenerateProjectPlanContext = {}
  ): Promise<ProjectPlan> {
    try {
      // 1. 에이전트를 통한 프로젝트 계획 생성
      const agent = new MasterDeveloperAgent();
      const plan = await agent.createProject(request, context);

      // 2. 생성된 계획을 저장
      if (context.projectId && context.userId) {
        const planData: ProjectPlanData = {
          projectId: context.projectId,
          userId: context.userId,
          planData: plan,
          context: context,
        };

        await this.repository.saveProjectPlan(planData);
      }

      return plan;
    } catch (error) {
      this.app.log.error(error, '프로젝트 계획 생성 실패');
      throw new Error('프로젝트 계획 생성에 실패했습니다.');
    }
  }

  async generateVirtualPreview(
    pageId: string,
    filePath: string
  ): Promise<string> {
    try {
      // 1. 기존 프리뷰 확인
      const existingPreview = await this.repository.getVirtualPreview(pageId, filePath);
      if (existingPreview) {
        return existingPreview;
      }

      // 2. 새로운 프리뷰 생성
      const previewAgent = new VirtualPreviewGeneratorAgent();
      const html = await previewAgent.execute({ pageId, filePath });

      // 3. 생성된 프리뷰 저장
      const previewData: VirtualPreviewData = {
        pageId,
        htmlContent: html,
        filePath,
      };

      await this.repository.saveVirtualPreview(previewData);

      return html;
    } catch (error) {
      this.app.log.error(error, '가상 프리뷰 생성 실패');
      throw new Error('가상 프리뷰 생성에 실패했습니다.');
    }
  }

  async getProjectPlan(projectId: string): Promise<ProjectPlan | null> {
    try {
      const planData = await this.repository.getProjectPlan(projectId);
      if (!planData) {
        return null;
      }

      return planData.planData as ProjectPlan;
    } catch (error) {
      this.app.log.error(error, '프로젝트 계획 조회 실패');
      throw new Error('프로젝트 계획 조회에 실패했습니다.');
    }
  }
}

// 기존 함수들 (하위 호환성을 위해 유지)
export async function generateProjectPlan(
  request: ProjectRequest,
  context: GenerateProjectPlanContext = {}
): Promise<ProjectPlan> {
  // TODO: app 인스턴스를 받아서 service를 생성하도록 수정 필요
  const agent = new MasterDeveloperAgent();
  return await agent.createProject(request, context);
}

export async function generateVirtualPreview(
  pageId: string,
  filePath: string
): Promise<string> {
  const previewAgent = new VirtualPreviewGeneratorAgent();
  return await previewAgent.execute({ pageId, filePath });
}
