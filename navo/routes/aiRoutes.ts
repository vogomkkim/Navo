import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
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

router.post('/command', authenticateToken, asyncHandler(handleAiCommand));
router.get('/suggestions', authenticateToken, asyncHandler(handleGetSuggestions));
router.get('/test-db-suggestions', asyncHandler(handleTestDbSuggestions));
router.post('/apply-suggestion', authenticateToken, asyncHandler(handleApplySuggestion));
router.post('/seed-dummy-data', authenticateToken, asyncHandler(handleSeedDummyData));
router.post('/generate-project', authenticateToken, asyncHandler(handleGenerateProject));
router.post('/generate-dummy-suggestion', authenticateToken, asyncHandler(handleGenerateDummySuggestion));

export default router;
