import { Express } from 'express';
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

export function setupApiRoutes(app: Express) {
  app.use('/api/auth', authRoutes);
  app.use('/api/components', componentRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/pages', pageRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/draft', draftRoutes);
  app.use('/health', healthRoutes);
  logger.info('API routes initialized');
}