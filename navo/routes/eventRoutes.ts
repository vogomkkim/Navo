import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { handleUnifiedEvents } from '../handlers/eventHandlers.js';
import { authenticateToken } from '../auth/auth.js';

async function eventRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.post('/', { preHandler: [authenticateToken] }, handleUnifiedEvents);
  fastify.post(
    '/log-error',
    { preHandler: [authenticateToken] },
    handleUnifiedEvents
  );
}

export default fp(eventRoutes);
