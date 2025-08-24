import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  handleEvents,
  handleLogError,
} from '../handlers/eventHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.post('/', authenticateToken, asyncHandler(handleEvents));
router.post('/log-error', authenticateToken, asyncHandler(handleLogError));

export default router;
