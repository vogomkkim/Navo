import { FastifyInstance } from 'fastify';
import { db } from '@/db/db.instance';
import { pages, projects } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { Page, CreatePageData, UpdatePageData, PagesRepository } from './pages.types';

export class PagesRepositoryImpl implements PagesRepository {
    constructor(private readonly app: FastifyInstance) { }

    async listPagesByProjectId(projectId: string): Promise<Page[]> {
        try {
            const result = await db
                .select({
                    id: pages.id,
                    path: pages.path,
                    name: pages.name,
                    description: pages.description,
                    layoutJson: pages.layoutJson,
                    isPublished: pages.isPublished,
                    projectId: pages.projectId,
                    createdAt: pages.createdAt,
                    updatedAt: pages.updatedAt,
                })
                .from(pages)
                .where(eq(pages.projectId, projectId))
                .orderBy(pages.path);

            this.app.log.info({ projectId, count: result.length }, '프로젝트 페이지 목록 조회 완료');
            return result;
        } catch (error) {
            this.app.log.error(error, '프로젝트 페이지 목록 조회 실패');
            throw new Error('프로젝트 페이지 목록 조회에 실패했습니다.');
        }
    }

    async getPageById(pageId: string): Promise<Page | null> {
        try {
            const result = await db
                .select({
                    id: pages.id,
                    path: pages.path,
                    name: pages.name,
                    description: pages.description,
                    layoutJson: pages.layoutJson,
                    isPublished: pages.isPublished,
                    projectId: pages.projectId,
                    createdAt: pages.createdAt,
                    updatedAt: pages.updatedAt,
                })
                .from(pages)
                .where(eq(pages.id, pageId))
                .limit(1);

            if (result.length === 0) {
                return null;
            }

            this.app.log.info({ pageId }, '페이지 조회 완료');
            return result[0];
        } catch (error) {
            this.app.log.error(error, '페이지 조회 실패');
            throw new Error('페이지 조회에 실패했습니다.');
        }
    }

    async getPageByProjectId(pageId: string, projectId: string): Promise<Page | null> {
        try {
            const result = await db
                .select({
                    id: pages.id,
                    path: pages.path,
                    name: pages.name,
                    description: pages.description,
                    layoutJson: pages.layoutJson,
                    isPublished: pages.isPublished,
                    projectId: pages.projectId,
                    createdAt: pages.createdAt,
                    updatedAt: pages.updatedAt,
                })
                .from(pages)
                .where(and(eq(pages.id, pageId), eq(pages.projectId, projectId)))
                .limit(1);

            if (result.length === 0) {
                return null;
            }

            this.app.log.info({ pageId, projectId }, '프로젝트 페이지 조회 완료');
            return result[0];
        } catch (error) {
            this.app.log.error(error, '프로젝트 페이지 조회 실패');
            throw new Error('프로젝트 페이지 조회에 실패했습니다.');
        }
    }

    async createPage(pageData: CreatePageData): Promise<Page> {
        try {
            const result = await db
                .insert(pages)
                .values({
                    path: pageData.path,
                    name: pageData.name,
                    description: pageData.description,
                    layoutJson: pageData.layoutJson,
                    isPublished: false,
                    projectId: pageData.projectId,
                })
                .returning({
                    id: pages.id,
                    path: pages.path,
                    name: pages.name,
                    description: pages.description,
                    layoutJson: pages.layoutJson,
                    isPublished: pages.isPublished,
                    projectId: pages.projectId,
                    createdAt: pages.createdAt,
                    updatedAt: pages.updatedAt,
                });

            this.app.log.info({ pageId: result[0].id, projectId: pageData.projectId }, '페이지 생성 완료');
            return result[0];
        } catch (error) {
            this.app.log.error(error, '페이지 생성 실패');
            throw new Error('페이지 생성에 실패했습니다.');
        }
    }

    async updatePage(pageId: string, pageData: UpdatePageData): Promise<Page> {
        try {
            const updateData: any = {
                updatedAt: new Date().toISOString(),
            };

            if (pageData.name !== undefined) updateData.name = pageData.name;
            if (pageData.description !== undefined) updateData.description = pageData.description;
            if (pageData.layoutJson !== undefined) updateData.layoutJson = pageData.layoutJson;
            if (pageData.isPublished !== undefined) updateData.isPublished = pageData.isPublished;

            const result = await db
                .update(pages)
                .set(updateData)
                .where(eq(pages.id, pageId))
                .returning({
                    id: pages.id,
                    path: pages.path,
                    name: pages.name,
                    description: pages.description,
                    layoutJson: pages.layoutJson,
                    isPublished: pages.isPublished,
                    projectId: pages.projectId,
                    createdAt: pages.createdAt,
                    updatedAt: pages.updatedAt,
                });

            if (result.length === 0) {
                throw new Error('페이지를 찾을 수 없습니다.');
            }

            this.app.log.info({ pageId }, '페이지 업데이트 완료');
            return result[0];
        } catch (error) {
            this.app.log.error(error, '페이지 업데이트 실패');
            throw new Error('페이지 업데이트에 실패했습니다.');
        }
    }

    async deletePage(pageId: string): Promise<void> {
        try {
            await db.delete(pages).where(eq(pages.id, pageId));

            this.app.log.info({ pageId }, '페이지 삭제 완료');
        } catch (error) {
            this.app.log.error(error, '페이지 삭제 실패');
            throw new Error('페이지 삭제에 실패했습니다.');
        }
    }

    async getPageByPath(projectId: string, path: string): Promise<Page | null> {
        try {
            const result = await db
                .select({
                    id: pages.id,
                    path: pages.path,
                    name: pages.name,
                    description: pages.description,
                    layoutJson: pages.layoutJson,
                    isPublished: pages.isPublished,
                    projectId: pages.projectId,
                    createdAt: pages.createdAt,
                    updatedAt: pages.updatedAt,
                })
                .from(pages)
                .where(and(eq(pages.projectId, projectId), eq(pages.path, path)))
                .limit(1);

            if (result.length === 0) {
                return null;
            }

            this.app.log.info({ projectId, path }, '경로별 페이지 조회 완료');
            return result[0];
        } catch (error) {
            this.app.log.error(error, '경로별 페이지 조회 실패');
            throw new Error('경로별 페이지 조회에 실패했습니다.');
        }
    }
}
