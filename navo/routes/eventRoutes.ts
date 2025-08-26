import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { handleUnifiedEvents } from '../handlers/eventHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.post('/', authenticateToken, asyncHandler(handleUnifiedEvents));
router.post('/log-error', authenticateToken, asyncHandler(handleUnifiedEvents));

export default router;
