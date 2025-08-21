import { Express } from 'express';
import { handleLogin, handleRegister } from '../auth/auth.js';
import { handleDraft, handleSave } from '../handlers/draftHandlers.js';
import {
  handleHealthCheck,
  handleDbTest,
} from '../handlers/healthAndDbTestHandlers.js';
import {
  handleEvents,
  handleAnalyticsEvents,
} from '../handlers/eventHandlers.js';
import {
  handleAiCommand,
  handleGetSuggestions,
  handleTestDbSuggestions,
  handleApplySuggestion,
  handleSeedDummyData,
  handleGenerateProject,
  handleGenerateComponentFromNaturalLanguage,
} from '../handlers/aiHandlers.js';
import {
  handleGetComponentDefinitions,
  handleGetComponentDefinition,
  handleSeedComponentDefinitions,
  handleCreateComponentDefinition,
  handleUpdateComponentDefinition,
  handleDeleteComponentDefinition,
} from '../handlers/componentHandlers.js';
import { handleGenerateDummySuggestion } from '../server.js';
import {
  handleListProjects,
  handleListProjectPages,
  handleGetPageLayout,
} from '../handlers/projectHandlers.js';

export function setupApiRoutes(app: Express) {
  app.get('/api/draft', handleDraft);
  app.post('/api/save', handleSave);
  app.post('/api/events', handleEvents);
  app.get('/health', handleHealthCheck);
  app.get('/api/db-test', handleDbTest);
  app.get('/api/analytics/events', handleAnalyticsEvents); // New endpoint for analytics events
  app.post('/api/ai-command', handleAiCommand); // New endpoint for AI commands
  app.get('/api/suggestions', handleGetSuggestions); // New endpoint to get suggestions
  app.get('/api/test-db-suggestions', handleTestDbSuggestions); // Temporary endpoint to test suggestions DB connection
  app.post('/api/generate-project', handleGenerateProject); // New endpoint for AI Intent Parser
  app.post('/api/seed-dummy-data', handleSeedDummyData); // Temporary endpoint to seed dummy user and project
  app.post('/api/apply-suggestion', handleApplySuggestion); // New endpoint to apply AI suggestions
  app.post('/api/generate-dummy-suggestion', handleGenerateDummySuggestion); // Temporary endpoint to trigger dummy suggestion generation

  // User Authentication Routes
  app.post('/api/register', handleRegister);
  app.post('/api/login', handleLogin);

  // Component Definition Routes
  app.get('/api/components', handleGetComponentDefinitions);
  app.get('/api/components/:name', handleGetComponentDefinition);
  app.post('/api/components/seed', handleSeedComponentDefinitions);
  app.post('/api/components', handleCreateComponentDefinition);
  app.post('/api/components/generate', handleGenerateComponentFromNaturalLanguage);
  app.put('/api/components/:id', handleUpdateComponentDefinition);
  app.delete('/api/components/:id', handleDeleteComponentDefinition);

  // Project and Page Management Routes
  app.get('/api/projects', handleListProjects);
  app.get('/api/projects/:projectId/pages', handleListProjectPages);
  app.get('/api/pages/:pageId', handleGetPageLayout);
}
