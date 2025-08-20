import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PageLayout } from './data/types.js';
import pg from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Import Gemini SDK
import dotenv from 'dotenv'; // Import dotenv

dotenv.config(); // Loads .env
dotenv.config({ path: '.env.local', override: true }); // Loads .env.local and overrides existing variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
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

// Serve static files from the 'web' directory
if (process.env.VERCEL_ENV !== 'production' && process.env.VERCEL_ENV !== 'preview') {
  const publicDir = path.join(process.cwd(), 'dist', 'web');
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

async function handleDraft(_req: express.Request, res: express.Response): Promise<void> {
  const mockLayout: PageLayout = {
    components: [
      { id: 'c1', type: 'Header', props: { title: 'Welcome to Navo' } },
      { id: 'c2', type: 'Hero', props: { headline: 'Build your app by talking to it.', cta: 'Get Started' } },
      { id: 'c3', type: 'Footer', props: { text: `© ${new Date().getFullYear()} Navo` } },
    ],
  };
  await delay(200);
  res.json({ ok: true, draft: { layout: mockLayout }, tookMs: 200 });
}

async function handleSave(req: express.Request, res: express.Response): Promise<void> {
  const body = req.body || {};
  await delay(100);
  const versionId = `v_${Date.now()}`;
  fs.appendFileSync(path.join(dataDir, 'saves.ndjson'), JSON.stringify({ ts: new Date().toISOString(), versionId, body }) + '\n', 'utf8');
  res.json({ ok: true, versionId });
}

async function handleEvents(req: express.Request, res: express.Response): Promise<void> {
  const body = req.body || {};
  const events = Array.isArray(body) ? body : Array.isArray(body?.events) ? body.events : [body];

  try {
    const client = await pool.connect();
    try {
      for (const event of events) {
        const { type, ...data } = event; // Extract type and rest of the event as data
        await client.query(
          'INSERT INTO events(type, data) VALUES($1, $2)',
          [type, data]
        );
      }
      res.json({ ok: true, received: events.length });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error inserting events:', err);
    res.status(500).json({ ok: false, error: 'Failed to store events' });
  }
}

async function handleHealth(_req: express.Request, res: express.Response): Promise<void> {
  res.json({ ok: true, message: 'Server is healthy' });
}

async function handleDbTest(_req: express.Request, res: express.Response): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as now');
      res.json({ ok: true, dbTime: result.rows[0].now });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database test failed', err);
    res.status(500).json({ ok: false, error: 'Database connection error' });
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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

    console.log("Gemini Raw Response:", text);

    // Attempt to parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);
      console.error("Raw Gemini text:", text);
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

async function generateAndStoreDummySuggestion(): Promise<void> {
  const dummySuggestion = {
    project_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Replace with a valid project ID from your DB or a test one
    type: 'style',
    content: {
      type: 'update',
      id: 'c1', // Assuming 'c1' is the ID of the Header component
      payload: {
        props: {
          style: {
            backgroundColor: '#f0f8ff' // AliceBlue
          }
        }
      },
      description: 'Suggests changing header background to AliceBlue for a softer look.'
    }
  };

  try {
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO suggestions(project_id, type, content) VALUES($1, $2, $3)',
        [dummySuggestion.project_id, dummySuggestion.type, dummySuggestion.content]
      );
      console.log('Dummy suggestion stored successfully.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error storing dummy suggestion:', err);
  }
}

// Temporary endpoint to trigger dummy suggestion generation
app.post('/api/generate-dummy-suggestion', async (_req: express.Request, res: express.Response) => {
  await generateAndStoreDummySuggestion();
  res.json({ ok: true, message: 'Dummy suggestion generation triggered.' });
});

async function handleGetSuggestions(_req: express.Request, res: express.Response): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id, type, content, created_at, applied_at FROM suggestions ORDER BY created_at DESC');
      res.json({ ok: true, suggestions: result.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch suggestions'});
  }
}

async function handleTestDbSuggestions(_req: express.Request, res: express.Response): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT id, type, content, created_at, applied_at FROM suggestions ORDER BY created_at DESC LIMIT 1');
      res.json({ ok: true, message: 'Successfully connected to database and queried suggestions table.' });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Error testing suggestions DB connection:', err);
    res.status(500).json({ ok: false, error: 'Failed to connect to database or query suggestions table.', details: err.message });
  }
}

// --- Utilities ---

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}