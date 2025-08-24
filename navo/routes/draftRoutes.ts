import { Router } from 'express';
import { handleDraft, handleSave } from '../handlers/draftHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.get('/', authenticateToken, handleDraft);
router.post('/save', authenticateToken, handleSave);

export default router;
