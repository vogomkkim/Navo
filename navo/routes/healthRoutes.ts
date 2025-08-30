import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { handleHealthCheck } from '../handlers/healthAndDbTestHandlers.js';

async function healthRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.get('/health', handleHealthCheck);
}

export default healthRoutes;
