import { FastifyRequest, FastifyReply } from 'fastify';

export async function handleHealthCheck(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Pure liveness probe (no DB access)
    reply.send({
      ok: true,
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    reply.status(500).send({
      ok: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
