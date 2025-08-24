import { Router } from 'express';
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

router.get('/', authenticateToken, handleGetComponentDefinitions);
router.get('/:name', authenticateToken, handleGetComponentDefinition);
router.post('/seed', authenticateToken, handleSeedComponentDefinitions);
router.post('/', authenticateToken, handleCreateComponentDefinition);
router.post('/generate', authenticateToken, handleGenerateComponentFromNaturalLanguage);
router.put('/:id', authenticateToken, handleUpdateComponentDefinition);
router.delete('/:id', authenticateToken, handleDeleteComponentDefinition);

export default router;
