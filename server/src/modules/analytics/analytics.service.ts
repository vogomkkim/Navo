import { FastifyInstance } from 'fastify';
import { AnalyticsRepositoryImpl } from './analytics.repository';
import { ProjectsRepositoryImpl } from '../projects/projects.repository';
import { AnalyticsEvent, AnalyticsMetrics, AnalyticsFilter } from './analytics.types';

export class AnalyticsService {
    private repository: AnalyticsRepositoryImpl;
    private projectRepository: ProjectsRepositoryImpl;

    constructor(private readonly app: FastifyInstance) {
        this.repository = new AnalyticsRepositoryImpl(app);
        this.projectRepository = new ProjectsRepositoryImpl(app);
    }

    async getProjectEvents(projectId: string, userId: string, filter?: AnalyticsFilter): Promise<AnalyticsEvent[]> {
        try {
            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            return await this.repository.getEventsByProjectId(projectId, filter);
        } catch (error) {
            this.app.log.error(error, '프로젝트 이벤트 조회 실패');
            throw new Error('프로젝트 이벤트 조회에 실패했습니다.');
        }
    }

    async getUserEvents(userId: string, filter?: AnalyticsFilter): Promise<AnalyticsEvent[]> {
        try {
            return await this.repository.getEventsByUserId(userId, filter);
        } catch (error) {
            this.app.log.error(error, '사용자 이벤트 조회 실패');
            throw new Error('사용자 이벤트 조회에 실패했습니다.');
        }
    }

    async getProjectMetrics(projectId: string, userId: string, filter?: AnalyticsFilter): Promise<AnalyticsMetrics> {
        try {
            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            return await this.repository.getProjectMetrics(projectId, filter);
        } catch (error) {
            this.app.log.error(error, '프로젝트 메트릭 조회 실패');
            throw new Error('프로젝트 메트릭 조회에 실패했습니다.');
        }
    }

    async getUserMetrics(userId: string, filter?: AnalyticsFilter): Promise<AnalyticsMetrics> {
        try {
            return await this.repository.getUserMetrics(userId, filter);
        } catch (error) {
            this.app.log.error(error, '사용자 메트릭 조회 실패');
            throw new Error('사용자 메트릭 조회에 실패했습니다.');
        }
    }

    async getTopPages(projectId: string, userId: string, limit?: number): Promise<Array<{ path: string; views: number }>> {
        try {
            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            return await this.repository.getTopPages(projectId, limit);
        } catch (error) {
            this.app.log.error(error, '상위 페이지 조회 실패');
            throw new Error('상위 페이지 조회에 실패했습니다.');
        }
    }

    async getTopEvents(projectId: string, userId: string, limit?: number): Promise<Array<{ eventType: string; count: number }>> {
        try {
            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            return await this.repository.getTopEvents(projectId, limit);
        } catch (error) {
            this.app.log.error(error, '상위 이벤트 조회 실패');
            throw new Error('상위 이벤트 조회에 실패했습니다.');
        }
    }

    async getEventTrends(projectId: string, userId: string, days: number = 30): Promise<Array<{ date: string; count: number }>> {
        try {
            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            return await this.repository.getEventTrends(projectId, days);
        } catch (error) {
            this.app.log.error(error, '이벤트 트렌드 조회 실패');
            throw new Error('이벤트 트렌드 조회에 실패했습니다.');
        }
    }

    async getDashboardData(projectId: string, userId: string): Promise<{
        metrics: AnalyticsMetrics;
        topPages: Array<{ path: string; views: number }>;
        topEvents: Array<{ eventType: string; count: number }>;
        trends: Array<{ date: string; count: number }>;
    }> {
        try {
            // 프로젝트 소유권 확인
            const project = await this.projectRepository.getProjectByUserId(projectId, userId);
            if (!project) {
                throw new Error('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            // 병렬로 모든 데이터 조회
            const [metrics, topPages, topEvents, trends] = await Promise.all([
                this.repository.getProjectMetrics(projectId),
                this.repository.getTopPages(projectId, 10),
                this.repository.getTopEvents(projectId, 10),
                this.repository.getEventTrends(projectId, 30),
            ]);

            return {
                metrics,
                topPages,
                topEvents,
                trends,
            };
        } catch (error) {
            this.app.log.error(error, '대시보드 데이터 조회 실패');
            throw new Error('대시보드 데이터 조회에 실패했습니다.');
        }
    }
}
