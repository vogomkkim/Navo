import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const errFile = path.resolve(__dirname, '..', 'server.err');

const logUnhandled = (label: string, error: unknown) => {
  try {
    const now = new Date().toISOString();
    const payload =
      error instanceof Error
        ? `${error.name} ${error.message}\n${error.stack ?? ''}`
        : String(error);
    fs.appendFileSync(errFile, `${now} ${label} ${payload}\n`);
  } catch {
    // ignore
  }
};

process.on('uncaughtException', (error) => {
  logUnhandled('[uncaughtException][bootstrap]', error);
});

process.on('unhandledRejection', (reason) => {
  logUnhandled('[unhandledRejection][bootstrap]', reason as unknown);
});

// Import the real server entry (ensures handlers are active even on early failures)
try {
  // Dev (tsx) path
  await import('./server.ts');
} catch (eTs) {
  logUnhandled('[import-attempt][server.ts]', eTs as unknown);
  try {
    // Prod (compiled) path
    await import('./server.js');
  } catch (eJs) {
    logUnhandled('[import-attempt][server.js]', eJs as unknown);
    throw eJs;
  }
}
