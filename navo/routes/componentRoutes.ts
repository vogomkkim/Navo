import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import {
  handleGetComponentDefinitions,
  handleGetComponentDefinition,
  handleSeedComponentDefinitions,
  handleCreateComponentDefinition,
  handleUpdateComponentDefinition,
  handleDeleteComponentDefinition,
  handleGenerateComponentFromNaturalLanguage,
} from '../handlers/componentHandlers.js';
import { authenticateToken } from '../auth/auth.js';

async function componentRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.get('/', { preHandler: [authenticateToken] }, handleGetComponentDefinitions);
  fastify.get(
    '/:name',
    { preHandler: [authenticateToken] },
    handleGetComponentDefinition
  );
  fastify.post(
    '/seed',
    { preHandler: [authenticateToken] },
    handleSeedComponentDefinitions
  );
  fastify.post(
    '/',
    { preHandler: [authenticateToken] },
    handleCreateComponentDefinition
  );
  fastify.post(
    '/generate',
    { preHandler: [authenticateToken] },
    handleGenerateComponentFromNaturalLanguage
  );
  fastify.put(
    '/:id',
    { preHandler: [authenticateToken] },
    handleUpdateComponentDefinition
  );
  fastify.delete(
    '/:id',
    { preHandler: [authenticateToken] },
    handleDeleteComponentDefinition
  );
}

export default fp(componentRoutes);
