import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
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
import { db } from '../db/db.js';
import { drafts } from '../db/schema.js';
import { eq } from 'drizzle-orm';

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const draftId = (request.params as any).draftId as string;
        const result = await db.select().from(drafts).where(eq(drafts.id, draftId));
        if (result.length === 0) {
          reply.status(404).send('Draft not found');
          return;
        }
        const draft = result[0];
        reply.type('application/json').send(draft.data);
      } catch (err) {
        reply.status(500).send({ error: 'Failed to render virtual preview' });
      }
    }
  );
}

export default aiRoutes;
