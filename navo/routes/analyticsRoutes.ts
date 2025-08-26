import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { handleUnifiedEvents } from '../handlers/eventHandlers.js';
import { authenticateToken } from '../auth/auth.js';

async function analyticsRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.get(
    '/events',
    { preHandler: [authenticateToken] },
    handleUnifiedEvents
  );
}

export default fp(analyticsRoutes);
