import { Router } from 'express';
import {
  handleAiCommand,
  handleGetSuggestions,
  handleTestDbSuggestions,
  handleApplySuggestion,
  handleSeedDummyData,
  handleGenerateProject,
  handleGenerateDummySuggestion,
} from '../handlers/aiHandlers.js';
import { authenticateToken } from '../auth/auth.js';

const router = Router();

router.post('/command', authenticateToken, handleAiCommand);
router.get('/suggestions', authenticateToken, handleGetSuggestions);
router.get('/test-db-suggestions', handleTestDbSuggestions);
router.post('/apply-suggestion', authenticateToken, handleApplySuggestion);
router.post('/seed-dummy-data', authenticateToken, handleSeedDummyData);
router.post('/generate-project', authenticateToken, handleGenerateProject);
router.post('/generate-dummy-suggestion', authenticateToken, handleGenerateDummySuggestion);

export default router;
