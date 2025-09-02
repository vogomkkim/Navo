import { FastifyInstance } from 'fastify';
import { authenticateToken } from '../../auth/auth.middleware.js';
import { generateProjectPlan, generateVirtualPreview } from '../agents.service.js';

export default async function agentsRoutes(fastify: FastifyInstance) {
  // Generate project plan via MasterDeveloperAgent
  fastify.post('/agents/generate-plan', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const body = request.body as any;
      const userId = (request as any).userId as string | undefined;
      const plan = await generateProjectPlan(
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
      reply.status(500).send({ ok: false, error: 'Failed to generate plan' });
    }
  });

  // Virtual preview generation
  fastify.get('/agents/preview/:pageId/*', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const params = request.params as any;
      const pageId = params.pageId as string;
      const filePath = `/${(params['*'] as string) || ''}`;
      const html = await generateVirtualPreview(pageId, filePath);
      reply.type('text/html').send(html);
    } catch (error) {
      reply.status(500).send({ ok: false, error: 'Failed to generate preview' });
    }
  });
}

