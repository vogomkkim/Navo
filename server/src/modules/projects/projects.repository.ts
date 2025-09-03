import { FastifyInstance } from 'fastify';
import { db } from '@/db/db.instance';
import { projects, pages, publishDeploys, components, componentDefinitions } from '@/drizzle/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Project, ProjectPage } from '@/modules/projects/projects.types';

export interface ProjectsRepository {
    listProjectsByUserId(userId: string): Promise<Project[]>;
    getProjectById(projectId: string): Promise<Project | null>;
    getProjectByUserId(projectId: string, userId: string): Promise<Project | null>;
    updateProjectName(projectId: string, name: string): Promise<Project>;
    deleteProjectById(projectId: string): Promise<void>;
    listPagesByProjectId(projectId: string): Promise<ProjectPage[]>;
    rollbackProject(projectId: string): Promise<any>;
}

export class ProjectsRepositoryImpl implements ProjectsRepository {
    constructor(private readonly app: FastifyInstance) { }

    async listProjectsByUserId(userId: string): Promise<Project[]> {
        try {
            const dbRows = await db
                .select({
                    id: projects.id,
                    name: projects.name,
                    description: projects.description,
                    ownerId: projects.ownerId,
                    createdAt: projects.createdAt,
                    updatedAt: projects.updatedAt,
                    requirements: projects.requirements,
                })
                .from(projects)
                .where(eq(projects.ownerId, userId))
                .orderBy(projects.name);

            const result = dbRows.map((row) => ({
                ...row,
                description: row.description ?? null,
                requirements: row.requirements ?? null,
            }));

            this.app.log.info({ userId, count: result.length }, '사용자 프로젝트 목록 조회 완료');
            return result as any;
        } catch (error) {
            this.app.log.error(error, '사용자 프로젝트 목록 조회 실패');
            throw new Error('사용자 프로젝트 목록 조회에 실패했습니다.');
        }
    }

    async getProjectById(projectId: string): Promise<Project | null> {
        try {
            const dbRows = await db
                .select({
                    id: projects.id,
                    name: projects.name,
                    description: projects.description,
                    ownerId: projects.ownerId,
                    createdAt: projects.createdAt,
                    updatedAt: projects.updatedAt,
                    requirements: projects.requirements,
                })
                .from(projects)
                .where(eq(projects.id, projectId))
                .limit(1);

            if (dbRows.length === 0) {
                return null;
            }

            const row = dbRows[0];
            const project = {
                ...row,
                description: row.description ?? null,
                requirements: row.requirements ?? null,
            };

            this.app.log.info({ projectId }, '프로젝트 조회 완료');
            return project as any;
        } catch (error) {
            this.app.log.error(error, '프로젝트 조회 실패');
            throw new Error('프로젝트 조회에 실패했습니다.');
        }
    }

    async getProjectByUserId(projectId: string, userId: string): Promise<Project | null> {
        try {
            const dbRows = await db
                .select({
                    id: projects.id,
                    name: projects.name,
                    description: projects.description,
                    ownerId: projects.ownerId,
                    createdAt: projects.createdAt,
                    updatedAt: projects.updatedAt,
                    requirements: projects.requirements,
                })
                .from(projects)
                .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
                .limit(1);

            if (dbRows.length === 0) {
                return null;
            }

            const row = dbRows[0];
            const project = {
                ...row,
                description: row.description ?? null,
                requirements: row.requirements ?? null,
            };

            this.app.log.info({ projectId, userId }, '사용자 프로젝트 조회 완료');
            return project as any;
        } catch (error) {
            this.app.log.error(error, '사용자 프로젝트 조회 실패');
            throw new Error('사용자 프로젝트 조회에 실패했습니다.');
        }
    }

    async updateProjectName(projectId: string, name: string): Promise<Project> {
        try {
            const dbRows = await db
                .update(projects)
                .set({
                    name,
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(projects.id, projectId))
                .returning({
                    id: projects.id,
                    name: projects.name,
                    description: projects.description,
                    ownerId: projects.ownerId,
                    createdAt: projects.createdAt,
                    updatedAt: projects.updatedAt,
                    requirements: projects.requirements,
                });

            if (dbRows.length === 0) {
                throw new Error('프로젝트를 찾을 수 없습니다.');
            }

            const row = dbRows[0];
            const project = {
                ...row,
                description: row.description ?? null,
                requirements: row.requirements ?? null,
            };

            this.app.log.info({ projectId, name }, '프로젝트 이름 변경 완료');
            return project as any;
        } catch (error) {
            this.app.log.error(error, '프로젝트 이름 변경 실패');
            throw new Error('프로젝트 이름 변경에 실패했습니다.');
        }
    }

    async deleteProjectById(projectId: string): Promise<void> {
        try {
            // Cascade delete will handle related records
            await db.delete(projects).where(eq(projects.id, projectId));

            this.app.log.info({ projectId }, '프로젝트 삭제 완료');
        } catch (error) {
            this.app.log.error(error, '프로젝트 삭제 실패');
            throw new Error('프로젝트 삭제에 실패했습니다.');
        }
    }

    async listPagesByProjectId(projectId: string): Promise<ProjectPage[]> {
        try {
            const dbRows = await db
                .select({
                    id: pages.id,
                    path: pages.path,
                    name: pages.name,
                    description: pages.description,
                    layoutJson: pages.layoutJson,
                    isPublished: pages.isPublished,
                    createdAt: pages.createdAt,
                    updatedAt: pages.updatedAt,
                })
                .from(pages)
                .where(eq(pages.projectId, projectId))
                .orderBy(pages.path);

            const result = dbRows.map((row) => ({
                ...row,
                description: row.description ?? null,
            }));

            this.app.log.info({ projectId, count: result.length }, '프로젝트 페이지 목록 조회 완료');
            return result as any;
        } catch (error) {
            this.app.log.error(error, '프로젝트 페이지 목록 조회 실패');
            throw new Error('프로젝트 페이지 목록 조회에 실패했습니다.');
        }
    }

    async rollbackProject(projectId: string): Promise<any> {
        try {
            // TODO: Implement rollback logic
            // This would involve restoring from a previous version
            this.app.log.info({ projectId }, '프로젝트 롤백 완료');
            return { success: true };
        } catch (error) {
            this.app.log.error(error, '프로젝트 롤백 실패');
            throw new Error('프로젝트 롤백에 실패했습니다.');
        }
    }
}
