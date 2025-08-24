import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { handleDraft, handleSave } from '../handlers/draftHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.get('/', authenticateToken, asyncHandler(handleDraft));
router.post('/save', authenticateToken, asyncHandler(handleSave));

export default router;
