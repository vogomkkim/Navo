/**
 * @file Defines the API endpoint for the workflow engine.
 */
import { FastifyInstance } from 'fastify';
import { OrchestratorService } from '@/core/orchestrator/orchestrator.service';

export function workflowController(app: FastifyInstance) {
  const orchestratorService = new OrchestratorService(app);

  app.post(
    '/api/workflow/execute',
    {
      preHandler: [app.authenticateToken], // Add authentication middleware
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          return reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
        }

        const { prompt, chatHistory } = request.body as { prompt: string, chatHistory: any[] };

        if (!prompt) {
          return reply.status(400).send({ error: 'Prompt is required.' });
        }

        // Pass the request to the orchestrator
        const result = await orchestratorService.handleRequest(prompt, { id: userId }, chatHistory || []);

        return reply.send(result);
      } catch (error: any) {
        app.log.error(error, 'Error in orchestrator service');
        return reply.status(500).send({
          error: 'Failed to handle request.',
          details: error.message,
        });
      }
    },
  );
}
