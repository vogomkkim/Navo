import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/db.instance';
import { projects, usersToOrganizations, vfsNodes } from '@/drizzle/schema';
import { CreateProjectData, Project } from './projects.types';
import { FastifyInstance } from 'fastify';

export class ProjectsRepositoryImpl {
  constructor(private readonly app: FastifyInstance) {}

  async createProject(projectData: CreateProjectData): Promise<Project> {
    return db.transaction(async (tx) => {
      const [newProject] = await tx
        .insert(projects)
        .values(projectData)
        .returning();

      await tx.insert(vfsNodes).values({
        projectId: newProject.id,
        parentId: null,
        nodeType: 'DIRECTORY',
        name: '/',
      });

      return newProject;
    });
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
        eq(projects.organizationId, usersToOrganizations.organizationId),
      )
      .where(eq(usersToOrganizations.userId, userId));
  }

  private async ensureVfsRootExists(projectId: string, tx: any = db): Promise<void> {
    const root = await tx
      .select({ id: vfsNodes.id })
      .from(vfsNodes)
      .where(and(eq(vfsNodes.projectId, projectId), isNull(vfsNodes.parentId)))
      .limit(1);

    if (root.length === 0) {
      this.app.log.warn(`VFS root for project ${projectId} not found. Creating it defensively.`);
      await tx.insert(vfsNodes).values({
        projectId: projectId,
        parentId: null,
        nodeType: 'DIRECTORY',
        name: '/',
      });
    }
  }

  async getProjectByUserId(
    projectId: string,
    userId: string,
  ): Promise<Project | null> {
    return db.transaction(async (tx) => {
      const result = await tx
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
          eq(projects.organizationId, usersToOrganizations.organizationId),
        )
        .where(
          and(
            eq(usersToOrganizations.userId, userId),
            eq(projects.id, projectId),
          ),
        );

      const project = result[0] || null;

      if (project) {
        // This is the defensive check.
        await this.ensureVfsRootExists(project.id, tx);
      }

      return project;
    });
  }
  
  // ... (rest of the file remains the same)
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
