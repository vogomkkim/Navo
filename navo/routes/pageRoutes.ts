import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { handleGetPageLayout } from '../handlers/projectHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.get('/:pageId', authenticateToken, asyncHandler(handleGetPageLayout));

export default router;
