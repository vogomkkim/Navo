import { FastifyInstance } from 'fastify';
import aiRoutes from './routes/aiRoutes';

export function aiController(app: FastifyInstance) {
  app.register(aiRoutes, { prefix: '/api' });
}
