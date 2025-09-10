import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    _startTime?: number;
    userId?: string;
    user?: { id: string; name: string; email: string };
  }
}

import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticateToken: (request: any, reply: any, done: any) => void;
  }
}
