import { FastifyInstance } from 'fastify';
import path from 'path';
import fastifyStatic from '@fastify/static';

export function staticController(app: FastifyInstance) {
  const root = path.join(process.cwd(), 'dist', 'web');
  app.register(fastifyStatic, {
    root,
    prefix: '/',
    wildcard: false,
    decorateReply: false,
  });

  app.get('/*', (req, reply) => {
    reply.sendFile('index.html', root);
  });
}
