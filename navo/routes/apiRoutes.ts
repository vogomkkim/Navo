import { FastifyInstance } from 'fastify';
import logger from '../core/logger.js';
import authRoutes from './authRoutes.js';
import componentRoutes from './componentRoutes.js';
import projectRoutes from './projectRoutes.js';
import pageRoutes from './pageRoutes.js';
import eventRoutes from './eventRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import aiRoutes from './aiRoutes.js';
import draftRoutes from './draftRoutes.js';
import healthRoutes from './healthRoutes.js';

export function setupApiRoutes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(componentRoutes, { prefix: '/api/components' });
  app.register(projectRoutes, { prefix: '/api/projects' });
  app.register(pageRoutes, { prefix: '/api/pages' });
  app.register(eventRoutes, { prefix: '/api/events' });
  app.register(analyticsRoutes, { prefix: '/api/analytics' });
  app.register(aiRoutes, { prefix: '/api/ai' });
  app.register(draftRoutes, { prefix: '/api/draft' });
  app.register(healthRoutes, { prefix: '/health' });
  logger.info('API routes initialized');
}
