import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { appConfig } from '@/config';

export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    reply.status(401).send({ ok: false, error: 'Access token required' });
    return;
  }
  try {
    const decoded: any = jwt.verify(token, appConfig.jwtSecret);
    if (!decoded || typeof decoded === 'string' || !decoded.userId) {
      reply.status(401).send({ ok: false, error: 'Invalid token' });
      return;
    }
    // Attach user info to request.user for consistency
    (request as any).user = { userId: decoded.userId, email: decoded.email };
  } catch {
    reply.status(401).send({ ok: false, error: 'Invalid token' });
  }
}
