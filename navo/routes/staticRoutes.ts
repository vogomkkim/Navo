import express, { Express } from 'express';
import path from 'path';

const __dirname = process.cwd();

export function setupStaticRoutes(app: Express) {
  // This is the directory where Webpack builds the frontend
  const buildDir = path.join(__dirname, 'dist', 'web');

  // Serve all static files (JS, CSS, images, etc.) from the build directory
  app.use(express.static(buildDir));

  // For any other GET request, serve the index.html file.
  // This allows client-side routing to handle all the pages.
  app.get('/*', (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}
