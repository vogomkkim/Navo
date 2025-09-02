import { FastifyInstance } from 'fastify';
import logger from '../core/logger.js';
import { authenticateToken } from '../auth/auth.js';
import aiRoutes from './aiRoutes.js';
import authRoutes from './authRoutes.js';
import projectRoutes from './projectRoutes.js';
import pageRoutes from './pageRoutes.js';
import componentRoutes from './componentRoutes.js';
import healthRoutes from './healthRoutes.js';

export default async function apiRoutes(app: FastifyInstance) {
  // Register routes (minimized logs)
  app.register(aiRoutes, { prefix: '/api' });
  app.register(authRoutes, { prefix: '/api' });
  app.register(projectRoutes, { prefix: '/api' });
  app.register(pageRoutes, { prefix: '/api' });
  app.register(componentRoutes, { prefix: '/api' });
  app.register(healthRoutes, { prefix: '/api' });
  logger.info('API 라우트 준비 완료');
}
