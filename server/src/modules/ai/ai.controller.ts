import { FastifyInstance } from 'fastify';
import aiRoutes from './routes/aiRoutes.js';

export function aiController(app: FastifyInstance) {
  app.register(aiRoutes, { prefix: '/api' });
}
