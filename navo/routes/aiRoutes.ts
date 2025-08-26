import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import {
  handleAiCommand,
  handleGetSuggestions,
  handleTestDbSuggestions,
  handleApplySuggestion,
  handleSeedDummyData,
  handleGenerateProject,
  handleGenerateDummySuggestion,
} from '../handlers/aiHandlers.js';
import { authenticateToken } from '../auth/auth.js';

async function aiRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.post('/command', { preHandler: [authenticateToken] }, handleAiCommand);
  fastify.get(
    '/suggestions',
    { preHandler: [authenticateToken] },
    handleGetSuggestions
  );
  fastify.get(
    '/test-db-suggestions',
    { preHandler: [authenticateToken] },
    handleTestDbSuggestions
  );
  fastify.post(
    '/apply-suggestion',
    { preHandler: [authenticateToken] },
    handleApplySuggestion
  );
  fastify.post(
    '/seed-dummy-data',
    { preHandler: [authenticateToken] },
    handleSeedDummyData
  );
  fastify.post(
    '/generate-project',
    { preHandler: [authenticateToken] },
    handleGenerateProject
  );
  fastify.post(
    '/generate-dummy-suggestion',
    { preHandler: [authenticateToken] },
    handleGenerateDummySuggestion
  );
}

export default fp(aiRoutes);
