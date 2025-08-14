import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PageLayout, ID } from './data/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidates = [
  path.join(__dirname, 'web'),
  path.resolve(__dirname, '..', '..', '..', 'navo', 'web'),
  path.resolve(process.cwd(), 'navo', 'web'),
];
const publicDir = candidates.find((p) => fs.existsSync(path.join(p, 'index.html'))) ?? candidates[0];
const dataDir = path.join(__dirname, 'data');

ensureDir(dataDir);

const PORT = Number(process.env.PORT ?? 3000);

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname === '/api/draft' && method === 'GET') {
      return handleDraft(req, res);
    }
    if (url.pathname === '/api/save' && method === 'POST') {
      return handleSave(req, res);
    }
    if (url.pathname === '/api/events' && method === 'POST') {
      return handleEvents(req, res);
    }

    // static files
    if (method === 'GET') {
      return serveStatic(url.pathname, res);
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server error', detail: String(err) }));
  }
});

server.listen(PORT, () => {
  console.log(`Mock server running at http://localhost:${PORT}`);
  console.log(`Serving static from: ${publicDir}`);
});

async function handleDraft(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  // W1 목표: 실제 그래프 실행 대신, 예측 가능한 목업 JSON 응답을 반환합니다.
  // 이 구조는 우리가 방금 types.ts에 정의한 PageLayout 타입과 호환됩니다.
  const mockLayout: PageLayout = {
    components: [
      { id: 'c1', type: 'Header', props: { title: 'Welcome to Navo' } },
      { id: 'c2', type: 'Hero', props: { headline: 'Build your app by talking to it.', cta: 'Get Started' } },
      { id: 'c3', type: 'Footer', props: { text: `© ${new Date().getFullYear()} Navo` } },
    ],
  };

  // Simulate small network and processing delay
  await delay(200);
  json(res, { ok: true, draft: { layout: mockLayout }, tookMs: 200 });
}

async function handleSave(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = await readJson(req).catch(() => ({}));
  await delay(100);
  const versionId = `v_${Date.now()}`;
  const line = JSON.stringify({ ts: new Date().toISOString(), versionId, body }) + '\n';
  fs.appendFileSync(path.join(dataDir, 'saves.ndjson'), line, 'utf8');
  json(res, { ok: true, versionId });
}

async function handleEvents(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = await readJson(req).catch(() => ({}));
  const events = Array.isArray(body) ? body : Array.isArray(body?.events) ? body.events : [body];
  const ts = new Date().toISOString();
  const lines = events.filter(Boolean).map((e: any) => JSON.stringify({ ts, ...e }) + '\n').join('');
  if (lines) fs.appendFileSync(path.join(dataDir, 'events.ndjson'), lines, 'utf8');
  json(res, { ok: true, received: events.length });
}

function serveStatic(requestPath: string, res: http.ServerResponse): void {
  const safePathRaw = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const filePath = path.normalize(path.join(publicDir, safePathRaw));
  if (!filePath.startsWith(publicDir)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  const contentType = mime(ext);
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  fs.createReadStream(filePath).pipe(res);
}

function mime(ext: string): string {
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

function json(res: http.ServerResponse, obj: unknown): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
