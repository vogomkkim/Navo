import { and, eq, sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '@/db/db.instance';
import { projects, usersToOrganizations, vfsNodes } from '@/drizzle/schema';
import type {
  Project,
  ProjectArchitecture,
  VfsNode,
} from '@/modules/projects/projects.types';

export interface ProjectsRepository {
  createProject(
    name: string,
    description: string | null,
    organizationId: string,
    userId: string,
  ): Promise<Project>;
  updateProjectFromArchitecture(
    projectId: string,
    architecture: ProjectArchitecture,
  ): Promise<void>;
  listProjectsByUserId(userId: string): Promise<Project[]>;
  getProjectById(projectId: string): Promise<Project | null>;
  getProjectByUserId(
    projectId: string,
    userId: string,
  ): Promise<Project | null>;
  updateProjectName(projectId: string, name: string): Promise<Project>;
  deleteProjectById(projectId: string): Promise<void>;
  listVfsNodesByParentId(
    projectId: string,
    parentId: string | null,
  ): Promise<VfsNode[]>;
  getVfsNodeById(nodeId: string, projectId: string): Promise<VfsNode | null>;
  updateVfsNodeContent(
    nodeId: string,
    content: string,
  ): Promise<VfsNode | null>;
  rollbackProject(projectId: string): Promise<any>;
}

export class ProjectsRepositoryImpl implements ProjectsRepository {
  constructor(private readonly app: FastifyInstance) {}

  async createProject(
    name: string,
    description: string | null,
    organizationId: string,
    userId: string,
  ): Promise<Project> {
    // ... (implementation from before)
  }

  async updateProjectFromArchitecture(
    projectId: string,
    architecture: ProjectArchitecture,
  ): Promise<void> {
    // ... (implementation from before)
  }

  async getVfsNodeById(
    nodeId: string,
    projectId: string,
  ): Promise<VfsNode | null> {
    // ... (implementation from before)
  }

  async updateVfsNodeContent(
    nodeId: string,
    content: string,
  ): Promise<VfsNode | null> {
    try {
      const updatedRows = await db
        .update(vfsNodes)
        .set({ content, updatedAt: new Date().toISOString() })
        .where(eq(vfsNodes.id, nodeId))
        .returning();

      if (updatedRows.length === 0) {
        return null;
      }
      return updatedRows[0] as VfsNode;
    } catch (error) {
      this.app.log.error(error, 'VFS 노드 내용 업데이트 실패');
      throw new Error('VFS 노드 내용 업데이트에 실패했습니다.');
    }
  }

  // ... (other method implementations)
}