import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authenticateToken } from '../auth/auth.middleware.js';
import { handleUnifiedEvents } from './events.handlers.js';

export default async function eventRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  fastify.post('/events', { preHandler: [authenticateToken] }, handleUnifiedEvents);
  fastify.post(
    '/events/log-error',
    { preHandler: [authenticateToken] },
    handleUnifiedEvents
  );
}
