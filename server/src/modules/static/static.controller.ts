import { FastifyInstance } from 'fastify';
import path from 'path';
import fastifyStatic from '@fastify/static';

export function staticController(app: FastifyInstance) {
  const root = path.join(process.cwd(), 'dist', 'web');
  app.register(fastifyStatic, {
    root,
    prefix: '/',
    wildcard: false,
    // decorateReply defaults to true; keep it enabled so reply.sendFile works
  });

  app.get('/*', (req, reply) => {
    if (req.url.startsWith('/api')) {
      reply.callNotFound();
      return;
    }
    reply.sendFile('index.html');
  });
}
