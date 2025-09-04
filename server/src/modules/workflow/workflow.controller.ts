/**
 * @file Defines the API endpoint for the workflow engine.
 */
import { FastifyInstance } from 'fastify';

import { WorkflowService } from './workflow.service';

export function workflowController(app: FastifyInstance) {
  const workflowService = new WorkflowService(app);

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

        const { prompt } = request.body as { prompt: string };

        if (!prompt) {
          return reply.status(400).send({ error: 'Prompt is required.' });
        }

        // Pass the user information to the service
        const result = await workflowService.run(prompt, { id: userId });

        return reply.send(result);
      } catch (error: any) {
        app.log.error(error, 'Error executing workflow');
        return reply.status(500).send({
          error: 'Failed to execute workflow.',
          details: error.message,
        });
      }
    },
  );
}
