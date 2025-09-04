import { and, eq } from 'drizzle-orm';
import { db } from '@/db/db.instance';
import { projects, usersToOrganizations } from '@/drizzle/schema';
import { CreateProjectData, Project } from './projects.types';
import { FastifyInstance } from 'fastify';

export class ProjectsRepositoryImpl {
  constructor(private readonly app: FastifyInstance) {}

  async createProject(projectData: CreateProjectData): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(projectData)
      .returning();
    return newProject;
  }

  async listProjectsByUserId(userId: string): Promise<Project[]> {
    return db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        organizationId: projects.organizationId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        requirements: projects.requirements,
      })
      .from(projects)
      .innerJoin(
        usersToOrganizations,
        eq(projects.organizationId, usersToOrganizations.organizationId)
      )
      .where(eq(usersToOrganizations.userId, userId));
  }

  async getProjectByUserId(
    projectId: string,
    userId: string
  ): Promise<Project | null> {
    const result = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        organizationId: projects.organizationId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        requirements: projects.requirements,
      })
      .from(projects)
      .innerJoin(
        usersToOrganizations,
        eq(projects.organizationId, usersToOrganizations.organizationId)
      )
      .where(
        and(
          eq(usersToOrganizations.userId, userId),
          eq(projects.id, projectId)
        )
      );

    return result[0] || null;
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    return result[0] || null;
  }

  async updateProjectName(projectId: string, name: string): Promise<Project | null> {
    const [updatedProject] = await db
      .update(projects)
      .set({ name, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, projectId))
      .returning();
    return updatedProject || null;
  }

  async deleteProjectById(projectId: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, projectId));
  }
  
  async rollbackProject(projectId: string): Promise<void> {
    // This is a placeholder. Real rollback logic would be more complex.
    // For example, restoring from a backup or reverting commits in a git repo.
    this.app.log.warn(`Rollback for project ${projectId} is not yet implemented.`);
    return Promise.resolve();
  }
}
