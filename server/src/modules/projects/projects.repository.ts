import { and, eq, inArray } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '@/db/db.instance';
import {
  projects,
  usersToOrganizations,
} from '@/drizzle/schema';
import type { Project } from '@/modules/projects/projects.types';
import { VfsRepositoryImpl } from './vfs.repository';

export interface ProjectsRepository {
  createProject(
    name: string,
    description: string | null,
    organizationId: string,
    userId: string,
  ): Promise<Project>;
  listProjectsByUserId(userId: string): Promise<Project[]>;
  getProjectById(projectId: string): Promise<Project | null>;
  getProjectByUserId(
    projectId: string,
    userId: string,
  ): Promise<Project | null>;
  updateProjectName(projectId: string, name: string): Promise<Project>;
  deleteProjectById(projectId: string): Promise<void>;
  rollbackProject(projectId: string): Promise<any>;
}

export class ProjectsRepositoryImpl implements ProjectsRepository {
  private vfsRepository: VfsRepositoryImpl;

  constructor(private readonly app: FastifyInstance) {
    this.vfsRepository = new VfsRepositoryImpl(app);
  }

  async createProject(
    name: string,
    description: string | null,
    organizationId: string,
    userId: string,
  ): Promise<Project> {
    try {
      const newProject = await db.transaction(async (tx) => {
        const [project] = await tx
          .insert(projects)
          .values({ name, description, organizationId })
          .returning();
        if (!project) throw new Error('Project creation failed.');
        
        await this.vfsRepository.createRootNode(project.id, tx);
        
        return project;
      });
      this.app.log.info({ projectId: newProject.id }, 'New project created');
      return newProject as Project;
    } catch (error) {
      this.app.log.error(error, 'Failed to create project');
      throw new Error('Failed to create project.');
    }
  }

  async listProjectsByUserId(userId: string): Promise<Project[]> {
    // ... (implementation remains the same)
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    // ... (implementation remains the same)
  }

  async getProjectByUserId(
    projectId: string,
    userId: string,
  ): Promise<Project | null> {
    // ... (implementation remains the same)
  }

  async updateProjectName(projectId: string, name: string): Promise<Project> {
    // ... (implementation remains the same)
  }

  async deleteProjectById(projectId: string): Promise<void> {
    // ... (implementation remains the same)
  }

  async rollbackProject(_projectId: string): Promise<any> {
    this.app.log.warn('Rollback feature is not yet implemented.');
    return { success: false, message: 'Not implemented' };
  }
}
