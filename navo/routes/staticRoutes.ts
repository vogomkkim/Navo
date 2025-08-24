import * as express from 'express';
import { Express } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config.js';
import logger from '../core/logger.js';

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

    logger.info('Serving static files from', { publicDir });

    app.use(express.static(publicDir, { index: false }));

    // Serve login.html specifically
    app.get('/login.html', (req, res) => {
      logger.info('Serving login.html');
      const loginPath = path.join(publicDir, 'login.html');

      fs.readFile(loginPath, 'utf8', (err, htmlData) => {
        if (err) {
          logger.error('Error reading login.html', err);
          return res.status(404).send('Not Found');
        }
        res.send(htmlData);
      });
    });

    // For any other GET request, serve index.html, allowing client-side routing
    app.get('/*', (req, res) => {
      logger.info('Received request', { path: req.path });
      const indexPath = path.join(publicDir, 'index.html');
      logger.debug('Reading index.html', { indexPath });

      fs.readFile(indexPath, 'utf8', (err, htmlData) => {
        if (err) {
          logger.error('Error reading index.html', err);
          return res.status(404).send('Not Found');
        }
        logger.debug('Successfully read index.html');

        const apiUrl = config.api.baseUrl;
        logger.info('Configured API_BASE_URL', { apiUrl });

        const modifiedHtml = htmlData.replace('__API_URL__', apiUrl);
        logger.debug('Replaced __API_URL__ placeholder');

        res.send(modifiedHtml);
      });
    });
  }
}