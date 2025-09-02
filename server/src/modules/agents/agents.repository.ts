import { FastifyInstance } from 'fastify';
import { db } from '@/db/db.instance';
import { projectPlans, virtualPreviews } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface ProjectPlanData {
    id?: string;
    projectId: string;
    userId: string;
    planData: any;
    context?: any;
    status?: string;
}

export interface VirtualPreviewData {
    id?: string;
    pageId: string;
    htmlContent: string;
    filePath: string;
}

export interface AgentRepository {
    saveProjectPlan(plan: ProjectPlanData): Promise<string>;
    getProjectPlan(projectId: string): Promise<ProjectPlanData | null>;
    saveVirtualPreview(preview: VirtualPreviewData): Promise<string>;
    getVirtualPreview(pageId: string, filePath: string): Promise<string | null>;
}

export class AgentsRepository implements AgentRepository {
    constructor(private readonly app: FastifyInstance) { }

    async saveProjectPlan(plan: ProjectPlanData): Promise<string> {
        try {
            const result = await db.insert(projectPlans).values({
                projectId: plan.projectId,
                userId: plan.userId,
                planData: plan.planData,
                context: plan.context || {},
                status: plan.status || 'active',
            }).returning({ id: projectPlans.id });

            const planId = result[0]?.id;
            if (!planId) {
                throw new Error('프로젝트 계획 저장 실패');
            }

            this.app.log.info({ planId, projectId: plan.projectId }, '프로젝트 계획 저장 완료');
            return planId;
        } catch (error) {
            this.app.log.error(error, '프로젝트 계획 저장 실패');
            throw new Error('프로젝트 계획 저장에 실패했습니다.');
        }
    }

    async getProjectPlan(projectId: string): Promise<ProjectPlanData | null> {
        try {
            const result = await db
                .select()
                .from(projectPlans)
                .where(
                    and(
                        eq(projectPlans.projectId, projectId),
                        eq(projectPlans.status, 'active')
                    )
                )
                .orderBy(desc(projectPlans.createdAt))
                .limit(1);

            if (result.length === 0) {
                return null;
            }

            const plan = result[0];
            this.app.log.info({ projectId, planId: plan.id }, '프로젝트 계획 조회 완료');

            return {
                id: plan.id,
                projectId: plan.projectId,
                userId: plan.userId,
                planData: plan.planData,
                context: plan.context,
                status: plan.status,
            };
        } catch (error) {
            this.app.log.error(error, '프로젝트 계획 조회 실패');
            throw new Error('프로젝트 계획 조회에 실패했습니다.');
        }
    }

    async saveVirtualPreview(preview: VirtualPreviewData): Promise<string> {
        try {
            // 기존 프리뷰가 있으면 업데이트, 없으면 새로 생성
            const existingPreview = await db
                .select()
                .from(virtualPreviews)
                .where(
                    and(
                        eq(virtualPreviews.pageId, preview.pageId),
                        eq(virtualPreviews.filePath, preview.filePath)
                    )
                )
                .limit(1);

            let result;
            if (existingPreview.length > 0) {
                // 업데이트
                result = await db
                    .update(virtualPreviews)
                    .set({
                        htmlContent: preview.htmlContent,
                        updatedAt: new Date().toISOString(),
                    })
                    .where(eq(virtualPreviews.id, existingPreview[0].id))
                    .returning({ id: virtualPreviews.id });
            } else {
                // 새로 생성
                result = await db
                    .insert(virtualPreviews)
                    .values({
                        pageId: preview.pageId,
                        htmlContent: preview.htmlContent,
                        filePath: preview.filePath,
                    })
                    .returning({ id: virtualPreviews.id });
            }

            const previewId = result[0]?.id;
            if (!previewId) {
                throw new Error('가상 프리뷰 저장 실패');
            }

            this.app.log.info({ previewId, pageId: preview.pageId }, '가상 프리뷰 저장 완료');
            return previewId;
        } catch (error) {
            this.app.log.error(error, '가상 프리뷰 저장 실패');
            throw new Error('가상 프리뷰 저장에 실패했습니다.');
        }
    }

    async getVirtualPreview(pageId: string, filePath: string): Promise<string | null> {
        try {
            const result = await db
                .select({ htmlContent: virtualPreviews.htmlContent })
                .from(virtualPreviews)
                .where(
                    and(
                        eq(virtualPreviews.pageId, pageId),
                        eq(virtualPreviews.filePath, filePath)
                    )
                )
                .limit(1);

            if (result.length === 0) {
                return null;
            }

            this.app.log.info({ pageId, filePath }, '가상 프리뷰 조회 완료');
            return result[0].htmlContent;
        } catch (error) {
            this.app.log.error(error, '가상 프리뷰 조회 실패');
            throw new Error('가상 프리뷰 조회에 실패했습니다.');
        }
    }
}
