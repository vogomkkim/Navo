import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { handleUnifiedEvents } from '../handlers/eventHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.get('/events', authenticateToken, asyncHandler(handleUnifiedEvents));

export default router;
