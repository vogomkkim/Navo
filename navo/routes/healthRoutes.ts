import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import {
  handleHealthCheck,
  handleDbTest,
} from '../handlers/healthAndDbTestHandlers.js';

async function healthRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.get('/', handleHealthCheck);
  fastify.get('/db-test', handleDbTest);
}

export default fp(healthRoutes);
