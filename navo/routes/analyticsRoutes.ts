import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { handleAnalyticsEvents } from '../handlers/eventHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.get('/events', authenticateToken, asyncHandler(handleAnalyticsEvents));

export default router;
