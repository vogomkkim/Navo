import { FastifyInstance } from 'fastify';
import { ProjectsRepositoryImpl } from './projects.repository';
import type { Project, ProjectPage } from '@/modules/projects/projects.types';

export class ProjectsService {
  private repository: ProjectsRepositoryImpl;

  constructor(private readonly app: FastifyInstance) {
    this.repository = new ProjectsRepositoryImpl(app);
  }

  async listProjects(userId: string): Promise<Project[]> {
    try {
      return await this.repository.listProjectsByUserId(userId);
    } catch (error) {
      this.app.log.error(error, '프로젝트 목록 조회 실패');
      throw new Error('프로젝트 목록 조회에 실패했습니다.');
    }
  }

  async listProjectPages(
    projectId: string,
    userId: string
  ): Promise<ProjectPage[]> {
    try {
      // Verify project ownership first
      const project = await this.repository.getProjectByUserId(
        projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }

      return await this.repository.listPagesByProjectId(projectId);
    } catch (error) {
      this.app.log.error(error, '프로젝트 페이지 목록 조회 실패');
      throw new Error('프로젝트 페이지 목록 조회에 실패했습니다.');
    }
  }

  async renameProject(
    projectId: string,
    name: string,
    userId: string
  ): Promise<Project> {
    try {
      // Verify project ownership first
      const project = await this.repository.getProjectByUserId(
        projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }

      return await this.repository.updateProjectName(projectId, name);
    } catch (error) {
      this.app.log.error(error, '프로젝트 이름 변경 실패');
      throw new Error('프로젝트 이름 변경에 실패했습니다.');
    }
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    try {
      // Verify project ownership first
      const project = await this.repository.getProjectByUserId(
        projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }

      await this.repository.deleteProjectById(projectId);
    } catch (error) {
      this.app.log.error(error, '프로젝트 삭제 실패');
      throw new Error('프로젝트 삭제에 실패했습니다.');
    }
  }

  async rollbackProject(projectId: string, userId: string): Promise<any> {
    try {
      // Verify project ownership first
      const project = await this.repository.getProjectByUserId(
        projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }

      return await this.repository.rollbackProject(projectId);
    } catch (error) {
      this.app.log.error(error, '프로젝트 롤백 실패');
      throw new Error('프로젝트 롤백에 실패했습니다.');
    }
  }
}
