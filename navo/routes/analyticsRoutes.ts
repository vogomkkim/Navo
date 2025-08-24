import { Router } from 'express';
import { handleAnalyticsEvents } from '../handlers/eventHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.get('/events', authenticateToken, handleAnalyticsEvents);

export default router;
