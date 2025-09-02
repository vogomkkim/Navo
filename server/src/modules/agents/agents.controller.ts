import { FastifyInstance } from 'fastify';
import { AgentsService } from './agents.service';

export function agentsController(app: FastifyInstance) {
  const agentsService = new AgentsService(app);

  // Generate project plan via MasterDeveloperAgent
  app.post('/api/agents/generate-plan', {
    preHandler: [app.authenticateToken]
  }, async (request, reply) => {
    try {
      const body = request.body as any;
      const userId = (request as any).userId as string | undefined;

      const plan = await agentsService.generateProjectPlan(
        {
          name: body?.name,
          description: body?.description,
          type: body?.type || 'web',
          features: Array.isArray(body?.features) ? body.features : [],
        },
        {
          userId,
          projectId: body?.projectId,
          sessionId: body?.sessionId,
          userAgent: request.headers['user-agent'],
          url: request.url,
        }
      );

      reply.send({ ok: true, plan });
    } catch (error) {
      app.log.error(error, '프로젝트 계획 생성 요청 실패');
      reply.status(500).send({
        ok: false,
        error: '프로젝트 계획 생성에 실패했습니다.'
      });
    }
  });

  // Virtual preview generation
  app.get('/api/agents/preview/:pageId/*', {
    preHandler: [app.authenticateToken]
  }, async (request, reply) => {
    try {
      const params = request.params as any;
      const pageId = params.pageId as string;
      const filePath = `/${(params['*'] as string) || ''}`;

      const html = await agentsService.generateVirtualPreview(pageId, filePath);
      reply.type('text/html').send(html);
    } catch (error) {
      app.log.error(error, '가상 프리뷰 생성 요청 실패');
      reply.status(500).send({
        ok: false,
        error: '가상 프리뷰 생성에 실패했습니다.'
      });
    }
  });

  // Get project plan
  app.get('/api/agents/plan/:projectId', {
    preHandler: [app.authenticateToken]
  }, async (request, reply) => {
    try {
      const params = request.params as any;
      const projectId = params.projectId as string;

      const plan = await agentsService.getProjectPlan(projectId);

      if (!plan) {
        reply.status(404).send({
          ok: false,
          error: '프로젝트 계획을 찾을 수 없습니다.'
        });
        return;
      }

      reply.send({ ok: true, plan });
    } catch (error) {
      app.log.error(error, '프로젝트 계획 조회 요청 실패');
      reply.status(500).send({
        ok: false,
        error: '프로젝트 계획 조회에 실패했습니다.'
      });
    }
  });
}
