import { FastifyInstance } from 'fastify';
import agentsRoutes from './routes/agentsRoutes.js';

export function agentsController(app: FastifyInstance) {
  app.register(agentsRoutes, { prefix: '/api' });
}

