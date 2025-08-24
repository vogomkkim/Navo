import { Router } from 'express';
import {
  handleListProjects,
  handleListProjectPages,
  handleRollback,
} from '../handlers/projectHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.get('/', authenticateToken, handleListProjects);
router.get('/:projectId/pages', authenticateToken, handleListProjectPages);
router.post('/:projectId/rollback', authenticateToken, handleRollback);

export default router;
