import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { handleDraft, handleSave } from '../handlers/draftHandlers.js';
import { authenticateToken } from '../auth/auth.js';

async function draftRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.get('/', { preHandler: [authenticateToken] }, handleDraft);
  fastify.post('/save', { preHandler: [authenticateToken] }, handleSave);
}

export default fp(draftRoutes);
