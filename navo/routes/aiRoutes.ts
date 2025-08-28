import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  handleAiCommand,
  handleGetSuggestions,
  handleTestDbSuggestions,
  handleApplySuggestion,
  handleSeedDummyData,
  handleGenerateProject,
  handleGenerateDummySuggestion,
  handleMultiAgentChat,
} from '../handlers/aiHandlers.js';
import { authenticateToken } from '../auth/auth.js';

async function aiRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.post(
    '/ai/command',
    { preHandler: [authenticateToken] },
    handleAiCommand
  );
  fastify.get(
    '/ai/suggestions',
    { preHandler: [authenticateToken] },
    handleGetSuggestions
  );
  fastify.get(
    '/ai/test-db-suggestions',
    { preHandler: [authenticateToken] },
    handleTestDbSuggestions
  );
  fastify.post(
    '/ai/apply-suggestion',
    { preHandler: [authenticateToken] },
    handleApplySuggestion
  );
  fastify.post(
    '/ai/seed-dummy-data',
    { preHandler: [authenticateToken] },
    handleSeedDummyData
  );
  fastify.post(
    '/ai/generate-project',
    { preHandler: [authenticateToken] },
    handleGenerateProject
  );
  fastify.post(
    '/ai/generate-dummy-suggestion',
    { preHandler: [authenticateToken] },
    handleGenerateDummySuggestion
  );
  fastify.post(
    '/ai/multi-agent',
    { preHandler: [authenticateToken] },
    handleMultiAgentChat
  );

  fastify.get(
    '/preview/:draftId/*',
    handleVirtualPreview
  );
}

export default aiRoutes;
