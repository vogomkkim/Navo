import { FastifyInstance } from 'fastify';

import type { Project, VfsNode } from '@/modules/projects/projects.types';

import { ProjectsRepositoryImpl } from './projects.repository';

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

  async listProjectVfsNodes(
    projectId: string,
    parentId: string | null,
    userId: string
  ): Promise<VfsNode[]> {
    try {
      // Verify project ownership first
      const project = await this.repository.getProjectByUserId(
        projectId,
        userId
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }

      return await this.repository.listVfsNodesByParentId(projectId, parentId);
    } catch (error) {
      this.app.log.error(error, '프로젝트 VFS 노드 목록 조회 실패');
      throw new Error('프로젝트 VFS 노드 목록 조회에 실패했습니다.');
    }
  }

  async getVfsNode(
    nodeId: string,
    projectId: string,
    userId: string,
  ): Promise<VfsNode | null> {
    try {
      // Verify project ownership first
      const project = await this.repository.getProjectByUserId(
        projectId,
        userId,
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }

      return await this.repository.getVfsNodeById(nodeId, projectId);
    } catch (error) {
      this.app.log.error(error, 'VFS 노드 조회 실패');
      throw new Error('VFS 노드 조회에 실패했습니다.');
    }
  }

  async updateVfsNodeContent(
    nodeId: string,
    projectId: string,
    userId: string,
    content: string,
  ): Promise<VfsNode | null> {
    try {
      // Verify project ownership first
      const project = await this.repository.getProjectByUserId(
        projectId,
        userId,
      );
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      }

      // Additional check: ensure the node belongs to the project
      const node = await this.repository.getVfsNodeById(nodeId, projectId);
      if (!node) {
        throw new Error('해당 파일이 프로젝트에 존재하지 않습니다.');
      }
      if (node.nodeType !== 'FILE') {
        throw new Error('디렉토리의 내용은 수정할 수 없습니다.');
      }

      return await this.repository.updateVfsNodeContent(nodeId, content);
    } catch (error) {
      this.app.log.error(error, 'VFS 노드 내용 업데이트 실패');
      throw new Error('VFS 노드 내용 업데이트에 실패했습니다.');
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
