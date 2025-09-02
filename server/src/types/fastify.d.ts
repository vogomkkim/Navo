import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticateToken: (request: any, reply: any, done: any) => void;
  }
}
