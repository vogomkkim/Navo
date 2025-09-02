import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export const healthController = (app: FastifyInstance) => {
  app.get('/health', async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.send({ ok: true, status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });
};
