import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PageLayout } from './data/types.js';
import pg from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Import Gemini SDK
import dotenv from 'dotenv'; // Import dotenv
import crypto from 'crypto';

dotenv.config(); // Loads .env
dotenv.config({ path: '.env.local', override: true }); // Loads .env.local and overrides existing variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.path}`);
  next();
});

const PORT = process.env.PORT ?? 3000;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err);
  } else {
    console.log('Database connected at:', res.rows[0].now);
  }
});

const dataDir = path.join(__dirname, 'data');
ensureDir(dataDir);

// Middleware to parse JSON bodies
app.use(express.json({ limit: '5mb' }));

// API routes
app.get('/api/draft', handleDraft);
app.post('/api/save', handleSave);
app.post('/api/events', handleEvents);
app.get('/health', handleHealth);
app.get('/api/db-test', handleDbTest);
app.get('/api/analytics/events', handleAnalyticsEvents); // New endpoint for analytics events
app.post('/api/ai-command', handleAiCommand); // New endpoint for AI commands
app.get('/api/suggestions', handleGetSuggestions); // New endpoint to get suggestions
app.get('/api/test-db-suggestions', handleTestDbSuggestions); // Temporary endpoint to test suggestions DB connection
app.post('/api/generate-project', handleGenerateProject); // New endpoint for AI Intent Parser
app.post('/api/seed-dummy-data', handleSeedDummyData); // Temporary endpoint to seed dummy user and project
app.post('/api/apply-suggestion', handleApplySuggestion); // New endpoint to apply AI suggestions

// Serve static files from the 'web' directory
if (process.env.VERCEL_ENV !== 'production' && process.env.VERCEL_ENV !== 'preview') {
  // In development mode, serve from navo/web directory
  const publicDir = path.join(__dirname, 'web');

  console.log(`[LOG] Serving static files from: ${publicDir}`);

  app.use(express.static(publicDir, { index: false }));

  // For any other GET request, serve index.html, allowing client-side routing
  app.get('/*', (req, res) => {
    console.log(`[LOG] Received request for: ${req.path}`);
    const indexPath = path.join(publicDir, 'index.html');
    console.log(`[LOG] Reading index.html from: ${indexPath}`);

    fs.readFile(indexPath, 'utf8', (err, htmlData) => {
      if (err) {
        console.error('[LOG] Error reading index.html:', err);
        return res.status(404).send('Not Found');
      }
      console.log('[LOG] Successfully read index.html.');

      const apiUrl = process.env.API_URL || '';
      console.log(`[LOG] Environment variable API_URL is: "${apiUrl}"`);

      const modifiedHtml = htmlData.replace('__API_URL__', apiUrl);
      console.log(`[LOG] Placeholder __API_URL__ replaced with "${apiUrl}".`);

      res.send(modifiedHtml);
    });
  });
}

export default app;

// --- Handlers ---

let currentMockLayout: PageLayout = {
  components: [
    { id: 'c1', type: 'Header', props: { title: 'Welcome to Navo' } },
    {
      id: 'c2',
      type: 'Hero',
      props: { headline: 'Build your app by talking to it.', cta: 'Get Started' },
    },
    { id: 'c3', type: 'Footer', props: { text: `© ${new Date().getFullYear()} Navo` } },
  ],
};

async function handleDraft(_req: express.Request, res: express.Response): Promise<void> {
  console.log('[HANDLER] Entering handleDraft');
  await delay(200);
  res.json({ ok: true, draft: { layout: currentMockLayout }, tookMs: 200 });
  console.log('[HANDLER] Exiting handleDraft');
}

async function handleSave(req: express.Request, res: express.Response): Promise<void> {
  console.log('[HANDLER] Entering handleSave', { body: req.body });
  const body = req.body || {};
  await delay(100);
  const versionId = `v_${Date.now()}`;
  fs.appendFileSync(
    path.join(dataDir, 'saves.ndjson'),
    JSON.stringify({ ts: new Date().toISOString(), versionId, body }) + '\n',
    'utf8',
  );
  res.json({ ok: true, versionId });
  console.log('[HANDLER] Exiting handleSave', { versionId });
}

async function handleEvents(req: express.Request, res: express.Response): Promise<void> {
  console.log('[HANDLER] Entering handleEvents', { body: req.body });
  const body = req.body || {};
  const events = Array.isArray(body) ? body : Array.isArray(body?.events) ? body.events : [body];

  try {
    const client = await pool.connect();
    try {
      for (const event of events) {
        const { type, ...data } = event; // Extract type and rest of the event as data
        console.log('[HANDLER] Inserting event:', { type, data });
        await client.query('INSERT INTO events(type, data) VALUES($1, $2)', [type, data]);
      }
      res.json({ ok: true, received: events.length });
      console.log('[HANDLER] Exiting handleEvents', { received: events.length });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[HANDLER] Error inserting events:', err, { eventsToInsert: events });
    res.status(500).json({ ok: false, error: 'Failed to store events' });
  }
}

async function handleHealth(_req: express.Request, res: express.Response): Promise<void> {
  res.json({ ok: true, message: 'Server is healthy' });
}

async function handleDbTest(_req: express.Request, res: express.Response): Promise<void> {
  console.log('[HANDLER] Entering handleDbTest');
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as now');
      res.json({ ok: true, dbTime: result.rows[0].now });
      console.log('[HANDLER] Exiting handleDbTest - Success');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[HANDLER] Database test failed:', err);
    res.status(500).json({ ok: false, error: 'Database connection error' });
    console.log('[HANDLER] Exiting handleDbTest - Failure');
  }
}

async function handleAnalyticsEvents(req: express.Request, res: express.Response): Promise<void> {
  const { projectId, eventType, limit = 100, offset = 0 } = req.query;
  let query = 'SELECT * FROM events WHERE 1=1';
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (projectId) {
    query += ` AND project_id = ${paramIndex++}`;
    params.push(projectId as string);
  }
  if (eventType) {
    query += ` AND type = ${paramIndex++}`;
    params.push(eventType as string);
  }

  query += ` ORDER BY ts DESC LIMIT ${paramIndex++} OFFSET ${paramIndex++}`;
  params.push(parseInt(limit as string));
  params.push(parseInt(offset as string));

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      res.json({ ok: true, events: result.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error fetching analytics events:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch analytics events' });
  }
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

async function handleAiCommand(req: express.Request, res: express.Response): Promise<void> {
  const { command, currentLayout } = req.body;
  console.log(`Received AI command: "${command}"`);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an AI assistant for a web page builder.
The user wants to modify their current web page.
Their command is: "${command}"
The current page layout is: ${JSON.stringify(currentLayout, null, 2)}

Based on the command and the current layout, generate a JSON object with two properties:
1. "layoutChanges": An object or array of objects describing the changes to be applied to the currentLayout.
   - If adding a component, use type: "add", payload: { id: "new_id", type: "ComponentType", props: {} }
   - If updating a component, use type: "update", id: "component_id", payload: { props: {} }
   - If replacing the entire layout, use { components: [...] }
   - Ensure new IDs are unique (e.g., "comp_12345").
   - Available component types are: Header, Hero, Footer.
   - For style changes, update the 'style' property within 'props'.
2. "aiResponseText": A brief, friendly message to the user confirming the action.

Example for "change header color to blue":
{
  "layoutChanges": [
    {
      "type": "update",
      "id": "c1", // Assuming c1 is the header
      "payload": {
        "props": {
          "style": {
            "color": "blue"
          }
        }
      }
    }
  ],
  "aiResponseText": "I changed the header color to blue for you."
}

Example for "add a new hero section":
{
  "layoutChanges": [
    {
      "type": "add",
      "payload": {
        "id": "hero_new_123",
        "type": "Hero",
        "props": {
          "headline": "New Section",
          "cta": "Learn More"
        }
      }
    }
  ],
  "aiResponseText": "I added a new hero section to your page."
}

Example for "make an online shopping mall":
{
  "layoutChanges": {
    "components": [
      { "id": "shop_header", "type": "Header", "props": { "title": "Navo Shop" } },
      { "id": "shop_hero", "type": "Hero", "props": { "headline": "Welcome to our Online Store!", "cta": "Shop Now" } },
      { "id": "shop_footer", "type": "Footer", "props": { "text": "© Navo Shop" } }
    ]
  },
  "aiResponseText": "I generated a basic online shopping mall layout for you."
}

Your response MUST be a valid JSON object. Do not include any other text or markdown outside the JSON.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Gemini Raw Response:', text);

    // Attempt to parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw Gemini text:', text);
      res.status(500).json({ ok: false, error: 'AI response was not valid JSON.' });
      return; // Explicitly return void after sending response
    }

    const { layoutChanges, aiResponseText } = parsedResponse;

    res.json({ ok: true, layoutChanges, aiResponseText });
    return; // Explicitly return void after sending response
  } catch (err) {
    console.error('Error calling Gemini API:', err);
    res.status(500).json({ ok: false, error: 'Failed to get response from AI.' });
    return; // Explicitly return void after sending response
  }
}

async function generateAiSuggestion(currentLayout: PageLayout): Promise<any> {
  console.log('[AI] Entering generateAiSuggestion', { currentLayout });
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an AI assistant that suggests improvements for web page layouts.
Analyze the provided 
currentLayout (a JSON object representing the page components).
Suggest ONE actionable improvement. The suggestion should be concise and focus on a single change.
The suggestion should be in the following JSON format:
{
  "type": "style" | "content" | "component", // Type of suggestion
  "content": { // The actual change to apply, matching the structure expected by the frontend
    "type": "update" | "add" | "remove",
    "id": "component_id", // If updating/removing
    "payload": { // The data for the change
      // e.g., for style update: { props: { style: { color: "blue" } } }
      // e.g., for content update: { props: { headline: "New Headline" } }
      // e.g., for add: { id: "new_id", type: "ComponentType", props: {} }
    },
    "description": "A brief, human-readable description of the suggestion."
  }
}

Example:
If the layout has a Header, suggest changing its background color.
If the layout has a Hero, suggest a different CTA text.

Current Layout: ${JSON.stringify(currentLayout, null, 2)}

Your suggestion:
`;

  try {
    console.log('[AI] Sending prompt to Gemini:', prompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    console.log('[AI] Gemini Suggestion Raw Response:', text);

    let parsedSuggestion;
    try {
      if (text.startsWith('```json')) {
        text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
      }
      console.log('[AI] Attempting to parse Gemini response:', text);
      parsedSuggestion = JSON.parse(text);
      console.log('[AI] Successfully parsed Gemini response.', parsedSuggestion);
    } catch (parseError) {
      console.error('[AI] Failed to parse Gemini suggestion as JSON:', parseError);
      console.error('[AI] Raw Gemini suggestion text:', text);
      throw new Error('AI suggestion was not valid JSON.');
    }
    console.log('[AI] Exiting generateAiSuggestion - Success');
    return parsedSuggestion;
  } catch (err) {
    console.error('[AI] Error calling Gemini API for suggestion:', err);
    console.log('[AI] Exiting generateAiSuggestion - Failure');
    throw new Error('Failed to get suggestion from AI.');
  }
}

async function generateAndStoreDummySuggestion(): Promise<void> {
  console.log('[AI] Entering generateAndStoreDummySuggestion');
  try {
    // Fetch the current layout from the draft API to pass to the AI
    console.log('[AI] Fetching current layout from /api/draft');
    const draftRes = await fetch(`http://localhost:${PORT}/api/draft`);
    const draftData = await draftRes.json();
    const currentLayout = draftData?.draft?.layout;

    if (!currentLayout) {
      console.error('[AI] Could not fetch current layout for AI suggestion.');
      return;
    }
    console.log('[AI] Successfully fetched current layout.');

    console.log('[AI] Generating AI suggestion...');
    const aiSuggestion = await generateAiSuggestion(currentLayout);
    console.log('[AI] AI suggestion generated:', aiSuggestion);

    // Use a placeholder project_id for now. In a real app, this would come from context.
    const projectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    try {
      const client = await pool.connect();
      try {
        console.log('[AI] Storing AI suggestion in database...');
        await client.query(
          'INSERT INTO suggestions(project_id, type, content) VALUES($1, $2, $3)',
          [projectId, aiSuggestion.type, aiSuggestion.content],
        );
        console.log('[AI] AI-generated suggestion stored successfully.');
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[AI] Error storing AI-generated suggestion:', err);
    }
  } catch (err: any) {
    console.error('[AI] Error in generateAndStoreDummySuggestion:', err);
  }
  console.log('[AI] Exiting generateAndStoreDummySuggestion');
}

// Temporary endpoint to trigger dummy suggestion generation
app.post('/api/generate-dummy-suggestion', async (_req: express.Request, res: express.Response) => {
  try {
    await generateAndStoreDummySuggestion();
    res.json({ ok: true, message: 'AI suggestion generated and stored.' });
  } catch (err: any) {
    console.error('Error generating and storing AI suggestion:', err);
    res
      .status(500)
      .json({ ok: false, error: err.message || 'Failed to generate and store AI suggestion.' });
  }
});

async function handleGetSuggestions(req: express.Request, res: express.Response): Promise<void> {
  console.log('[HANDLER] Entering handleGetSuggestions');

  // Get query parameters for refresh and limit
  const refresh = req.query.refresh === 'true';
  const limit = parseInt(req.query.limit as string) || 3;

  try {
    const client = await pool.connect();
    try {
      console.log('[HANDLER] Fetching suggestions from database...', { refresh, limit });
      let query: string;
      let params: any[] = [];

      if (refresh) {
        // Random selection for refresh
        query =
          'SELECT id, type, content, created_at, applied_at FROM suggestions ORDER BY RANDOM() LIMIT $1';
        params = [limit];
      } else {
        // Default: latest suggestions
        query =
          'SELECT id, type, content, created_at, applied_at FROM suggestions ORDER BY created_at DESC LIMIT $1';
        params = [limit];
      }

      const result = await client.query(query, params);
      res.json({
        ok: true,
        suggestions: result.rows,
        total: result.rows.length,
        refresh: refresh,
        limit: limit,
      });
      console.log('[HANDLER] Exiting handleGetSuggestions - Success', {
        count: result.rows.length,
        refresh,
        limit,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[HANDLER] Error fetching suggestions:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch suggestions' });
    console.log('[HANDLER] Exiting handleGetSuggestions - Failure');
  }
}

async function handleTestDbSuggestions(
  _req: express.Request,
  res: express.Response,
): Promise<void> {
  console.log('[HANDLER] Entering handleTestDbSuggestions');
  try {
    const client = await pool.connect();
    try {
      console.log('[HANDLER] Testing suggestions DB connection...');
      await client.query(
        'SELECT id, type, content, created_at, applied_at FROM suggestions ORDER BY created_at DESC LIMIT 1',
      );
      res.json({
        ok: true,
        message: 'Successfully connected to database and queried suggestions table.',
      });
      console.log('[HANDLER] Exiting handleTestDbSuggestions - Success');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[HANDLER] Error testing suggestions DB connection:', err);
    res.status(500).json({
      ok: false,
      error: 'Failed to connect to database or query suggestions table.',
      details: err.message,
    });
    console.log('[HANDLER] Exiting handleTestDbSuggestions - Failure');
  }
}

async function handleApplySuggestion(req: express.Request, res: express.Response): Promise<void> {
  console.log('[HANDLER] Entering handleApplySuggestion', { body: req.body });
  const { suggestionId, layoutChanges } = req.body;

  if (!layoutChanges) {
    res.status(400).json({ ok: false, error: 'layoutChanges are required.' });
    console.log('[HANDLER] Exiting handleApplySuggestion - Failure: Missing layoutChanges');
    return;
  }

  try {
    // Apply layout changes to currentMockLayout
    if (Array.isArray(layoutChanges)) {
      for (const change of layoutChanges) {
        if (change.type === 'add') {
          currentMockLayout.components.push(change.payload);
          console.log('[HANDLER] Applied add change:', change.payload);
        } else if (change.type === 'update') {
          currentMockLayout.components = currentMockLayout.components.map((comp) =>
            comp.id === change.id ? { ...comp, ...change.payload } : comp,
          );
          console.log('[HANDLER] Applied update change for ID:', change.id);
        } else if (change.type === 'remove') {
          currentMockLayout.components = currentMockLayout.components.filter(
            (comp) => comp.id !== change.id,
          );
          console.log('[HANDLER] Applied remove change for ID:', change.id);
        }
      }
    } else if (layoutChanges.components) {
      // If the entire layout is replaced
      currentMockLayout = layoutChanges;
      console.log('[HANDLER] Replaced entire layout.');
    }

    // Update applied_at timestamp in DB
    if (suggestionId) {
      const client = await pool.connect();
      try {
        await client.query('UPDATE suggestions SET applied_at = NOW() WHERE id = $1', [
          suggestionId,
        ]);
        console.log('[HANDLER] Updated applied_at for suggestionId:', suggestionId);
      } finally {
        client.release();
      }
    }

    res.json({
      ok: true,
      message: 'Suggestion applied successfully.',
      newLayout: currentMockLayout,
    });
    console.log('[HANDLER] Exiting handleApplySuggestion - Success');
  } catch (err: any) {
    console.error('[HANDLER] Error applying suggestion:', err);
    res.status(500).json({ ok: false, error: 'Failed to apply suggestion.', details: err.message });
    console.log('[HANDLER] Exiting handleApplySuggestion - Failure');
  }
}

async function handleSeedDummyData(_req: express.Request, res: express.Response): Promise<void> {
  console.log('[HANDLER] Entering handleSeedDummyData');
  const dummyUserId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const dummyProjectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  try {
    const client = await pool.connect();
    try {
      // Insert dummy user if not exists
      console.log('[HANDLER] Checking for dummy user...');
      const userExists = await client.query('SELECT 1 FROM users WHERE id = $1', [dummyUserId]);
      if (userExists.rows.length === 0) {
        console.log('[HANDLER] Inserting dummy user...');
        await client.query('INSERT INTO users(id, email, name) VALUES($1, $2, $3)', [
          dummyUserId,
          'dummy@example.com',
          'Dummy User',
        ]);
        console.log('[HANDLER] Dummy user inserted.');
      } else {
        console.log('[HANDLER] Dummy user already exists.');
      }

      // Insert dummy project if not exists
      console.log('[HANDLER] Checking for dummy project...');
      const projectExists = await client.query('SELECT 1 FROM projects WHERE id = $1', [
        dummyProjectId,
      ]);
      if (projectExists.rows.length === 0) {
        console.log('[HANDLER] Inserting dummy project...');
        await client.query('INSERT INTO projects(id, owner_id, name) VALUES($1, $2, $3)', [
          dummyProjectId,
          dummyUserId,
          'Dummy Project for AI Suggestions',
        ]);
        console.log('[HANDLER] Dummy project inserted.');
      } else {
        console.log('[HANDLER] Dummy project already exists.');
      }

      res.json({ ok: true, message: 'Dummy user and project seeded successfully.' });
      console.log('[HANDLER] Exiting handleSeedDummyData - Success');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[HANDLER] Error seeding dummy data:', err);
    res.status(500).json({ ok: false, error: 'Failed to seed dummy data.', details: err.message });
    console.log('[HANDLER] Exiting handleSeedDummyData - Failure');
  }
}

async function handleGenerateProject(req: express.Request, res: express.Response): Promise<void> {
  const { description, features, targetAudience, businessType } = req.body;
  console.log(`Received project generation request: "${description}"`);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an AI architect for a web application builder. The user wants to create a website with the following requirements:

Description: "${description}"
Features: ${features ? features.join(', ') : 'Not specified'}
Target Audience: ${targetAudience || 'General users'}
Business Type: ${businessType || 'Not specified'}

Based on these requirements, generate a complete project structure including:

1. Database schema with tables, columns, and relationships
2. Page structure with routes and layouts
3. Component definitions for the UI
4. API endpoints for functionality
5. SQL schema for database creation

Your response MUST be a valid JSON object with this structure:
{
  "structure": {
    "name": "Project Name",
    "description": "Brief description",
    "pages": [
      {
        "name": "Page Name",
        "path": "/route",
        "components": [
          {
            "id": "comp_id",
            "type": "ComponentType",
            "props": { "title": "Value" }
          }
        ],
        "layout": "single-column"
      }
    ],
    "components": [
      {
        "name": "Component Name",
        "type": "ComponentType",
        "props": { "title": "Default Value" }
      }
    ],
    "database": {
      "tables": [
        {
          "name": "table_name",
          "columns": [
            {
              "name": "column_name",
              "type": "text|integer|boolean|timestamp|json|uuid",
              "nullable": false,
              "primaryKey": true
            }
          ],
          "indexes": ["index_name"]
        }
      ],
      "relationships": [
        {
          "from": "table1",
          "to": "table2",
          "type": "one-to-many",
          "foreignKey": "table2.table1_id"
        }
      ]
    },
    "apiEndpoints": [
      {
        "path": "/api/endpoint",
        "method": "GET|POST|PUT|DELETE",
        "description": "What this endpoint does"
      }
    ]
  },
  "code": {
    "database": "CREATE TABLE...",
    "components": {},
    "pages": {},
    "api": {}
  },
  "instructions": [
    "Step 1: Create database tables",
    "Step 2: Set up API endpoints",
    "Step 3: Create page components"
  ]
}

Focus on creating a realistic, functional structure. For example, if it's an Instagram-like site, include tables for users, posts, comments, likes, follows, etc.

Your response MUST be valid JSON. Do not include any other text or markdown outside the JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    console.log('AI Project Generation Raw Response:', text);

    // Attempt to parse the JSON response
    let parsedResponse;
    try {
      if (text.startsWith('```json')) {
        text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
      }
      parsedResponse = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse AI project generation response as JSON:', parseError);
      console.error('Raw AI text:', text);
      res.status(500).json({ ok: false, error: 'AI response was not valid JSON.', details: text });
      return;
    }

    // Validate the response structure
    if (!parsedResponse.structure || !parsedResponse.code) {
      res.status(500).json({ ok: false, error: 'AI response missing required structure or code.' });
      return;
    }

    // Save the generated project to database
    try {
      const client = await pool.connect();
      try {
        // Use the existing dummy user ID for now
        const dummyUserId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

        // Generate a proper UUID for the project
        console.log('[DEBUG-START] Entering handleGenerateProject');
        const projectId = crypto.randomUUID();
        console.log('[DEBUG] Generated projectId:', projectId);
        console.error('[DEBUG-ERROR] Project ID before DB insert:', projectId);

        console.log('[PROJECT] Saving generated project to database:', {
          projectId,
          ownerId: dummyUserId,
          name: parsedResponse.structure.name,
        });

        await client.query(
          'INSERT INTO projects (id, owner_id, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
          [
            projectId,
            dummyUserId,
            parsedResponse.structure.name,
            new Date().toISOString(),
            new Date().toISOString(),
          ],
        );

        console.log('[PROJECT] Project saved successfully to database');

        // Also save the generated pages if they exist
        if (parsedResponse.structure.pages && parsedResponse.structure.pages.length > 0) {
          console.log('[PROJECT] Saving generated pages to database...');

          for (const page of parsedResponse.structure.pages) {
            const pageId = crypto.randomUUID();
            const pageLayout = {
              components: page.components || [],
              layout: page.layout || 'single-column',
            };

            await client.query(
              'INSERT INTO pages (id, project_id, path, layout_json, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
              [
                pageId,
                projectId,
                page.path,
                JSON.stringify(pageLayout),
                new Date().toISOString(),
                new Date().toISOString(),
              ],
            );

            console.log(`[PROJECT] Page "${page.name}" saved with path: ${page.path}`);
          }
        }
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('[PROJECT] Failed to save project to database:', dbError);
      // Continue even if DB save fails, but log the error properly
    }

    res.json({
      ok: true,
      project: parsedResponse,
      message: `Successfully generated project structure for: ${parsedResponse.structure.name}`,
    });
  } catch (error) {
    console.error('AI project generation failed:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate project structure.' });
  }
}

// --- Utilities ---

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
