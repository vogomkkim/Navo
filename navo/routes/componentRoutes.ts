import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  handleGetComponentDefinitions,
  handleGetComponentDefinition,
  handleSeedComponentDefinitions,
  handleCreateComponentDefinition,
  handleUpdateComponentDefinition,
  handleDeleteComponentDefinition,
  handleGenerateComponentFromNaturalLanguage,
} from '../handlers/componentHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.get('/', authenticateToken, asyncHandler(handleGetComponentDefinitions));
router.get('/:name', authenticateToken, asyncHandler(handleGetComponentDefinition));
router.post('/seed', authenticateToken, asyncHandler(handleSeedComponentDefinitions));
router.post('/', authenticateToken, asyncHandler(handleCreateComponentDefinition));
router.post('/generate', authenticateToken, asyncHandler(handleGenerateComponentFromNaturalLanguage));
router.put('/:id', authenticateToken, asyncHandler(handleUpdateComponentDefinition));
router.delete('/:id', authenticateToken, asyncHandler(handleDeleteComponentDefinition));

export default router;
