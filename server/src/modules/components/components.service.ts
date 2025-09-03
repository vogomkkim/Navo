import { FastifyInstance } from 'fastify';
import { ComponentsRepositoryImpl } from '@/modules/components/components.repository';
import {
  ComponentDefinition,
  CreateComponentDefinitionData,
  UpdateComponentDefinitionData,
  ComponentInstance,
} from '@/modules/components/components.types';
import { ProjectsRepositoryImpl } from '@/modules/projects/projects.repository';
import { PagesRepositoryImpl } from '@/modules/pages/pages.repository';

export class ComponentsService {
  private repository: ComponentsRepositoryImpl;
  private projectRepository: ProjectsRepositoryImpl;
  private pageRepository: PagesRepositoryImpl;

  constructor(private readonly app: FastifyInstance) {
    this.repository = new ComponentsRepositoryImpl(app);
    this.projectRepository = new ProjectsRepositoryImpl(app);
    this.pageRepository = new PagesRepositoryImpl(app);
  }

  async listComponentDefinitions(
    projectId: string,
    userId: string
  ): Promise<ComponentDefinition[]> {
    try {
      const project = await this.projectRepository.getProjectByUserId(
        projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }
      return await this.repository.listComponentDefinitions(projectId);
    } catch (error) {
      this.app.log.error(error, '컴포넌트 정의 목록 조회 실패');
      throw new Error('컴포넌트 정의 목록 조회에 실패했습니다.');
    }
  }

  async getComponentDefinition(
    id: string,
    userId: string
  ): Promise<ComponentDefinition> {
    try {
      const component = await this.repository.getComponentDefinitionById(id);
      if (!component) {
        throw new Error('컴포넌트 정의를 찾을 수 없습니다.');
      }
      const project = await this.projectRepository.getProjectByUserId(
        component.projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }
      return component;
    } catch (error) {
      this.app.log.error(error, '컴포넌트 정의 조회 실패');
      throw new Error('컴포넌트 정의 조회에 실패했습니다.');
    }
  }

  async getComponentDefinitionByName(
    name: string,
    projectId: string,
    userId: string
  ): Promise<ComponentDefinition> {
    try {
      const project = await this.projectRepository.getProjectByUserId(
        projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }
      const component = await this.repository.getComponentDefinitionByName(
        name,
        projectId
      );
      if (!component) {
        throw new Error('컴포넌트 정의를 찾을 수 없습니다.');
      }
      return component;
    } catch (error) {
      this.app.log.error(error, '이름별 컴포넌트 정의 조회 실패');
      throw new Error('이름별 컴포넌트 정의 조회에 실패했습니다.');
    }
  }

  async createComponentDefinition(
    data: CreateComponentDefinitionData,
    userId: string
  ): Promise<ComponentDefinition> {
    try {
      const project = await this.projectRepository.getProjectByUserId(
        data.projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }
      const existing = await this.repository.getComponentDefinitionByName(
        data.name,
        data.projectId
      );
      if (existing) {
        throw new Error('이미 존재하는 컴포넌트 이름입니다.');
      }
      return await this.repository.createComponentDefinition(data);
    } catch (error) {
      this.app.log.error(error, '컴포넌트 정의 생성 실패');
      throw new Error('컴포넌트 정의 생성에 실패했습니다.');
    }
  }

  async updateComponentDefinition(
    id: string,
    data: UpdateComponentDefinitionData,
    userId: string
  ): Promise<ComponentDefinition> {
    try {
      const component = await this.repository.getComponentDefinitionById(id);
      if (!component) {
        throw new Error('컴포넌트 정의를 찾을 수 없습니다.');
      }
      const project = await this.projectRepository.getProjectByUserId(
        component.projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }
      return await this.repository.updateComponentDefinition(id, data);
    } catch (error) {
      this.app.log.error(error, '컴포넌트 정의 업데이트 실패');
      throw new Error('컴포넌트 정의 업데이트에 실패했습니다.');
    }
  }

  async deleteComponentDefinition(id: string, userId: string): Promise<void> {
    try {
      const component = await this.repository.getComponentDefinitionById(id);
      if (!component) {
        throw new Error('컴포넌트 정의를 찾을 수 없습니다.');
      }
      const project = await this.projectRepository.getProjectByUserId(
        component.projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }
      await this.repository.deleteComponentDefinition(id);
    } catch (error) {
      this.app.log.error(error, '컴포넌트 정의 삭제 실패');
      throw new Error('컴포넌트 정의 삭제에 실패했습니다.');
    }
  }

  async seedComponentDefinitions(
    projectId: string,
    components: any[],
    userId: string
  ): Promise<ComponentDefinition[]> {
    try {
      const project = await this.projectRepository.getProjectByUserId(
        projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }
      return await this.repository.seedComponentDefinitions(
        projectId,
        components
      );
    } catch (error) {
      this.app.log.error(error, '컴포넌트 정의 시드 실패');
      throw new Error('컴포넌트 정의 시드에 실패했습니다.');
    }
  }

  async generateComponentFromNaturalLanguage(
    description: string,
    projectId: string,
    userId: string
  ): Promise<ComponentDefinition> {
    try {
      const project = await this.projectRepository.getProjectByUserId(
        projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }
      const generatedComponent: CreateComponentDefinitionData = {
        name: `generated_${Date.now()}`,
        displayName: 'Generated Component',
        description: description,
        category: 'generated',
        propsSchema: {},
        renderTemplate: `<div>${description}</div>`,
        cssStyles: '',
        projectId,
      };
      return await this.repository.createComponentDefinition(
        generatedComponent
      );
    } catch (error) {
      this.app.log.error(error, '자연어 컴포넌트 생성 실패');
      throw new Error('자연어 컴포넌트 생성에 실패했습니다.');
    }
  }

  async createComponentInstance(
    pageId: string,
    componentDefinitionId: string,
    userId: string
  ): Promise<ComponentInstance> {
    try {
      const page = await this.pageRepository.getPageById(pageId);
      if (!page) {
        throw new Error('페이지를 찾을 수 없습니다.');
      }
      const project = await this.projectRepository.getProjectByUserId(
        page.projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트에 접근할 권한이 없습니다.');
      }
      const definition = await this.repository.getComponentDefinitionById(componentDefinitionId);
      if (!definition || definition.projectId !== page.projectId) {
        throw new Error('컴포넌트 정의를 찾을 수 없거나 프로젝트에 속하지 않습니다.');
      }
      const orderIndex = await this.repository.countComponentsByPageId(pageId);
      const newInstance = await this.repository.createComponentInstance({
        pageId,
        componentDefinitionId,
        props: definition.propsSchema || {},
        orderIndex,
      });
      this.app.log.info({ instanceId: newInstance.id, pageId }, '컴포넌트 인스턴스 생성 성공');
      return newInstance;
    } catch (error) {
      this.app.log.error(error, '컴포넌트 인스턴스 생성 실패');
      throw new Error('컴포넌트 인스턴스 생성에 실패했습니다.');
    }
  }
}