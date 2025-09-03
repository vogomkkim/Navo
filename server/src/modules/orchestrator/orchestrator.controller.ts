import { FastifyInstance } from 'fastify';
import { OrchestratorService } from './orchestrator.service';

export function orchestratorController(app: FastifyInstance) {
  const orchestratorService = new OrchestratorService(app);

  app.post(
    '/api/orchestrate',
    {
      preHandler: [app.authenticateToken], // Reuse existing authentication
    },
    async (request, reply) => {
      try {
        const { userMessage } = request.body as { userMessage: string };
        const { userId } = request.user as { userId: string }; // Extract userId from authenticated user

        if (!userMessage) {
          reply.status(400).send({ ok: false, error: 'userMessage is required' });
          return;
        }

        // Pass both userMessage and userId to the service
        const result = await orchestratorService.processUserRequest(userMessage, userId);

        reply.send({ ok: true, result });
      } catch (error) {
        app.log.error(error, 'Orchestration failed');
        reply.status(500).send({
          ok: false,
          error: 'Failed to process request through orchestrator.',
        });
      }
    }
  );
}
