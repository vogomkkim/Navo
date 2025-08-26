import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { handleGetPageLayout } from '../handlers/projectHandlers.js';
import { authenticateToken } from '../auth/auth.js';

async function pageRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.get(
    '/:pageId',
    { preHandler: [authenticateToken] },
    handleGetPageLayout
  );
}

export default fp(pageRoutes);
