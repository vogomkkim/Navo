import * as express from 'express';
import { Express } from 'express';
import * as path from 'path';
import * as fs from 'fs';

// Alternative approach for __dirname in CommonJS style
const __dirname = process.cwd();

export function setupStaticRoutes(app: Express) {
  // Serve static files from the 'web' directory
  if (
    process.env.VERCEL_ENV !== 'production' &&
    process.env.VERCEL_ENV !== 'preview'
  ) {
    // In development mode, serve from navo/web directory
    const publicDir = path.join(__dirname, 'navo', 'web');

    console.log(`[LOG] Serving static files from: ${publicDir}`);

    app.use(express.static(publicDir, { index: false }));

    // Serve login.html specifically
    app.get('/login.html', (req, res) => {
      console.log(`[LOG] Serving login.html`);
      const loginPath = path.join(publicDir, 'login.html');

      fs.readFile(loginPath, 'utf8', (err, htmlData) => {
        if (err) {
          console.error('[LOG] Error reading login.html:', err);
          return res.status(404).send('Not Found');
        }
        res.send(htmlData);
      });
    });

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
}
