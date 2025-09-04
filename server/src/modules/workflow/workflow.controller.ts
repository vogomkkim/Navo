/**
 * @file Defines the API endpoint for the workflow engine.
 */
import { FastifyInstance } from 'fastify';

import { WorkflowService } from './workflow.service';

export function workflowController(app: FastifyInstance) {
  const workflowService = new WorkflowService(app);

  app.post('/api/workflow/execute', async (request, reply) => {
    try {
      // We'll expand the request body as we define more complex inputs
      const { prompt } = request.body as { prompt: string };

      if (!prompt) {
        return reply.status(400).send({ error: 'Prompt is required.' });
      }

      const result = await workflowService.run(prompt);

      return reply.send(result);
    } catch (error: any) {
      app.log.error(error, 'Error executing workflow');
      return reply
        .status(500)
        .send({ error: 'Failed to execute workflow.', details: error.message });
    }
  });
}
