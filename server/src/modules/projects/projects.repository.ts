import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '@/db/db.instance';
import {
  projects,
  usersToOrganizations,
  vfsNodes,
} from '@/drizzle/schema';
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
    try {
      const newProject = await db.transaction(async (tx) => {
        // 1. Create the project record
        const projectRows = await tx
          .insert(projects)
          .values({
            name,
            description,
            organizationId,
          })
          .returning();
        const project = projectRows[0];

        if (!project) {
          throw new Error('Project creation failed and did not return a result.');
        }

        // 2. Create a root directory for the project in the VFS
        await tx.insert(vfsNodes).values({
          projectId: project.id,
          parentId: null, // Root node has no parent
          nodeType: 'DIRECTORY',
          name: '/',
        });

        return project;
      });

      this.app.log.info(
        {
          projectId: newProject.id,
          organizationId,
          userId,
        },
        '새 프로젝트 생성 완료 (VFS 루트 포함)',
      );

      return {
        ...newProject,
        description: newProject.description ?? null,
        requirements: newProject.requirements ?? null,
      } as any;
    } catch (error) {
      this.app.log.error(error, '새 프로젝트 생성 실패');
      throw new Error('새 프로젝트 생성에 실패했습니다.');
    }
  }

  async updateProjectFromArchitecture(
    projectId: string,
    architecture: ProjectArchitecture,
  ): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        const rootNodeResult = await tx
          .select({ id: vfsNodes.id })
          .from(vfsNodes)
          .where(
            and(
              eq(vfsNodes.projectId, projectId),
              sql`${vfsNodes.parentId} IS NULL`,
            ),
          );
        const rootId = rootNodeResult[0]?.id;

        if (!rootId) {
          throw new Error('Project root directory not found.');
        }

        // Clear existing VFS nodes for this project (except the root)
        await tx
          .delete(vfsNodes)
          .where(
            and(
              eq(vfsNodes.projectId, projectId),
              sql`${vfsNodes.parentId} IS NOT NULL`,
            ),
          );

        // Insert new file nodes from the architecture plan
        if (architecture.pages && architecture.pages.length > 0) {
          const fileNodes = architecture.pages.map((page) => ({
            projectId,
            parentId: rootId,
            nodeType: 'FILE' as const,
            name: page.name,
            content: page.content ?? '',
            metadata: { path: page.path, description: page.description },
          }));
          if (fileNodes.length > 0) {
            await tx.insert(vfsNodes).values(fileNodes);
          }
        }
      });

      this.app.log.info(
        { projectId },
        '프로젝트 아키텍처 DB 반영 완료',
      );
    } catch (error) {
      this.app.log.error(error, '프로젝트 아키텍처 DB 반영 실패');
      throw new Error('프로젝트 아키텍처를 데이터베이스에 반영하는 데 실패했습니다.');
    }
  }
}