import { FastifyInstance } from 'fastify';
import { AnalyticsService } from './analytics.service';

export function analyticsController(app: FastifyInstance) {
    const analyticsService = new AnalyticsService(app);

    // 프로젝트 이벤트 조회
    app.get('/api/analytics/project/:projectId/events', {
        preHandler: [app.authenticateToken]
    }, async (request, reply) => {
        try {
            const userId = (request as any).userId as string | undefined;
            if (!userId) {
                reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
                return;
            }

            const params = request.params as any;
            const projectId = params.projectId as string;
            const query = request.query as any;

            const filter = {
                startDate: query.startDate,
                endDate: query.endDate,
                eventTypes: query.eventTypes ? query.eventTypes.split(',') : undefined,
            };

            const events = await analyticsService.getProjectEvents(projectId, userId, filter);
            reply.send({ events });
        } catch (error) {
            app.log.error(error, '프로젝트 이벤트 조회 실패');
            reply.status(500).send({ error: '프로젝트 이벤트 조회에 실패했습니다.' });
        }
    });

    // 사용자 이벤트 조회
    app.get('/api/analytics/user/events', {
        preHandler: [app.authenticateToken]
    }, async (request, reply) => {
        try {
            const userId = (request as any).userId as string | undefined;
            if (!userId) {
                reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
                return;
            }

            const query = request.query as any;
            const filter = {
                startDate: query.startDate,
                endDate: query.endDate,
                eventTypes: query.eventTypes ? query.eventTypes.split(',') : undefined,
            };

            const events = await analyticsService.getUserEvents(userId, filter);
            reply.send({ events });
        } catch (error) {
            app.log.error(error, '사용자 이벤트 조회 실패');
            reply.status(500).send({ error: '사용자 이벤트 조회에 실패했습니다.' });
        }
    });

    // 프로젝트 메트릭 조회
    app.get('/api/analytics/project/:projectId/metrics', {
        preHandler: [app.authenticateToken]
    }, async (request, reply) => {
        try {
            const userId = (request as any).userId as string | undefined;
            if (!userId) {
                reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
                return;
            }

            const params = request.params as any;
            const projectId = params.projectId as string;
            const query = request.query as any;

            const filter = {
                startDate: query.startDate,
                endDate: query.endDate,
                eventTypes: query.eventTypes ? query.eventTypes.split(',') : undefined,
            };

            const metrics = await analyticsService.getProjectMetrics(projectId, userId, filter);
            reply.send({ metrics });
        } catch (error) {
            app.log.error(error, '프로젝트 메트릭 조회 실패');
            reply.status(500).send({ error: '프로젝트 메트릭 조회에 실패했습니다.' });
        }
    });

    // 사용자 메트릭 조회
    app.get('/api/analytics/user/metrics', {
        preHandler: [app.authenticateToken]
    }, async (request, reply) => {
        try {
            const userId = (request as any).userId as string | undefined;
            if (!userId) {
                reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
                return;
            }

            const query = request.query as any;
            const filter = {
                startDate: query.startDate,
                endDate: query.endDate,
                eventTypes: query.eventTypes ? query.eventTypes.split(',') : undefined,
            };

            const metrics = await analyticsService.getUserMetrics(userId, filter);
            reply.send({ metrics });
        } catch (error) {
            app.log.error(error, '사용자 메트릭 조회 실패');
            reply.status(500).send({ error: '사용자 메트릭 조회에 실패했습니다.' });
        }
    });

    // 상위 페이지 조회
    app.get('/api/analytics/project/:projectId/top-pages', {
        preHandler: [app.authenticateToken]
    }, async (request, reply) => {
        try {
            const userId = (request as any).userId as string | undefined;
            if (!userId) {
                reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
                return;
            }

            const params = request.params as any;
            const projectId = params.projectId as string;
            const query = request.query as any;
            const limit = query.limit ? parseInt(query.limit) : 10;

            const topPages = await analyticsService.getTopPages(projectId, userId, limit);
            reply.send({ topPages });
        } catch (error) {
            app.log.error(error, '상위 페이지 조회 실패');
            reply.status(500).send({ error: '상위 페이지 조회에 실패했습니다.' });
        }
    });

    // 상위 이벤트 조회
    app.get('/api/analytics/project/:projectId/top-events', {
        preHandler: [app.authenticateToken]
    }, async (request, reply) => {
        try {
            const userId = (request as any).userId as string | undefined;
            if (!userId) {
                reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
                return;
            }

            const params = request.params as any;
            const projectId = params.projectId as string;
            const query = request.query as any;
            const limit = query.limit ? parseInt(query.limit) : 10;

            const topEvents = await analyticsService.getTopEvents(projectId, userId, limit);
            reply.send({ topEvents });
        } catch (error) {
            app.log.error(error, '상위 이벤트 조회 실패');
            reply.status(500).send({ error: '상위 이벤트 조회에 실패했습니다.' });
        }
    });

    // 이벤트 트렌드 조회
    app.get('/api/analytics/project/:projectId/trends', {
        preHandler: [app.authenticateToken]
    }, async (request, reply) => {
        try {
            const userId = (request as any).userId as string | undefined;
            if (!userId) {
                reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
                return;
            }

            const params = request.params as any;
            const projectId = params.projectId as string;
            const query = request.query as any;
            const days = query.days ? parseInt(query.days) : 30;

            const trends = await analyticsService.getEventTrends(projectId, userId, days);
            reply.send({ trends });
        } catch (error) {
            app.log.error(error, '이벤트 트렌드 조회 실패');
            reply.status(500).send({ error: '이벤트 트렌드 조회에 실패했습니다.' });
        }
    });

    // 대시보드 데이터 조회 (통합)
    app.get('/api/analytics/project/:projectId/dashboard', {
        preHandler: [app.authenticateToken]
    }, async (request, reply) => {
        try {
            const userId = (request as any).userId as string | undefined;
            if (!userId) {
                reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
                return;
            }

            const params = request.params as any;
            const projectId = params.projectId as string;

            const dashboardData = await analyticsService.getDashboardData(projectId, userId);
            reply.send(dashboardData);
        } catch (error) {
            app.log.error(error, '대시보드 데이터 조회 실패');
            reply.status(500).send({ error: '대시보드 데이터 조회에 실패했습니다.' });
        }
    });
}
