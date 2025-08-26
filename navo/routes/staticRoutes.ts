import { FastifyInstance } from 'fastify';
import path from 'path';
import fastifyStatic from '@fastify/static';

const __dirname = process.cwd();

export function setupStaticRoutes(app: FastifyInstance) {
  // This is the directory where Webpack builds the frontend
  const buildDir = path.join(__dirname, 'dist', 'web');

  // Serve all static files (JS, CSS, images, etc.) from the build directory
  app.register(fastifyStatic, {
    root: buildDir,
    prefix: '/',
  });

  // For any other GET request, serve the index.html file.
  // This allows client-side routing to handle all the pages.
  app.get('/*', (request, reply) => {
    reply.sendFile('index.html', buildDir);
  });
}
