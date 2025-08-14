import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PageLayout } from './data/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
const PORT = process.env.PORT ?? 3000;

const dataDir = path.join(__dirname, 'data');
ensureDir(dataDir);

// Middleware to parse JSON bodies
app.use(express.json({ limit: '5mb' }));

// API routes
app.get('/api/draft', handleDraft);
app.post('/api/save', handleSave);
app.post('/api/events', handleEvents);

// Serve static files from the 'web' directory
const publicDir = path.join(__dirname, 'web');
app.use(express.static(publicDir));

// For any other GET request, serve index.html, allowing client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not Found');
  }
});

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
  const line = JSON.stringify({ ts: new Date().toISOString(), versionId, body }) + '\n';
  fs.appendFileSync(path.join(dataDir, 'saves.ndjson'), line, 'utf8');
  res.json({ ok: true, versionId });
}

async function handleEvents(req: express.Request, res: express.Response): Promise<void> {
  const body = req.body || {};
  const events = Array.isArray(body) ? body : Array.isArray(body?.events) ? body.events : [body];
  const ts = new Date().toISOString();
  const lines = events.filter(Boolean).map((e: any) => JSON.stringify({ ts, ...e }) + '\n').join('');
  if (lines) fs.appendFileSync(path.join(dataDir, 'events.ndjson'), lines, 'utf8');
  res.json({ ok: true, received: events.length });
}

// --- Utilities ---

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}