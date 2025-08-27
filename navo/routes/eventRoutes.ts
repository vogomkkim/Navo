import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { handleUnifiedEvents } from '../handlers/eventHandlers.js';
import { authenticateToken } from '../auth/auth.js';

async function eventRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.post(
    '/events',
    { preHandler: [authenticateToken] },
    handleUnifiedEvents
  );
  fastify.post(
    '/events/log-error',
    { preHandler: [authenticateToken] },
    handleUnifiedEvents
  );
}

export default eventRoutes;
