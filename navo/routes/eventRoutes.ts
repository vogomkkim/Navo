import { Router } from 'express';
import {
  handleEvents,
  handleLogError,
} from '../handlers/eventHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.post('/', authenticateToken, handleEvents);
router.post('/log-error', authenticateToken, handleLogError);

export default router;
