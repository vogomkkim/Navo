import { FastifyRequest, FastifyReply } from 'fastify';
import logger from '../core/logger.js';
import { FastifyError } from '@fastify/error';

export function errorHandlingMiddleware(
  error: FastifyError,
  _req: FastifyRequest,
  reply: FastifyReply
) {
  const status = error.statusCode || 500;
  const message =
    status >= 500
      ? 'Internal Server Error'
      : error.message || 'Request failed';

  logger.error(
    'Unhandled error',
    { message: error.message, stack: error.stack }
  );
  reply.status(status).send({ error: message });
}
