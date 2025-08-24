import { Router } from 'express';
import { handleGetPageLayout } from '../handlers/projectHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.get('/:pageId', authenticateToken, handleGetPageLayout);

export default router;
