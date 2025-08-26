import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import {
  handleListProjects,
  handleListProjectPages,
  handleRollback,
} from '../handlers/projectHandlers.js';
import { authenticateToken } from '../auth/auth.js';

async function projectRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.get('/', { preHandler: [authenticateToken] }, handleListProjects);
  fastify.get(
    '/:projectId/pages',
    { preHandler: [authenticateToken] },
    handleListProjectPages
  );
  fastify.post(
    '/:projectId/rollback',
    { preHandler: [authenticateToken] },
    handleRollback
  );
}

export default fp(projectRoutes);
