import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/db.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  hashPassword as hashWithScrypt,
  verifyPassword as verifyWithScrypt,
} from './password.js';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function handleRegister(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  console.log('[AUTH] Entering handleRegister');

  try {
    const { email, password, name } = request.body as any;

    if (!email || !password) {
      reply
        .status(400)
        .send({ ok: false, error: 'Email and password are required' });
      return;
    }

    // Check if user already exists
    const existingRows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const existingUser = existingRows[0];

    if (existingUser) {
      reply.status(400).send({ ok: false, error: 'User already exists' });
      return;
    }

    // Hash password with scrypt
    const hashedPassword = await hashWithScrypt(password);

    // Create user
    const inserted = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name: name || null,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      });

    const user = inserted[0];

    reply.send({ ok: true, user });
  } catch (error) {
    console.error('[AUTH] Error during registration:', error);
    reply.status(500).send({ ok: false, error: 'Registration failed' });
  }
}

export async function handleLogin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { email, password } = request.body as any;

    if (!email || !password) {
      reply
        .status(400)
        .send({ ok: false, error: 'Email and password are required' });
      return;
    }

    // Find user
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = rows[0];

    if (!user || !user.password) {
      reply.status(401).send({ ok: false, error: 'Invalid credentials' });
      return;
    }

    // Check password (scrypt only)
    const verify = await verifyWithScrypt(password, user.password);
    if (!verify.ok) {
      reply.status(401).send({ ok: false, error: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: '24h' }
    );

    reply.send({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[AUTH] Error during login:', error);
    reply.status(500).send({ ok: false, error: 'Login failed' });
  }
}

export function getUserIdFromToken(
  authHeader: string | undefined
): string | null {
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    if (typeof decoded === 'string' || !decoded.userId) {
      return null;
    }

    return decoded.userId;
  } catch (error) {
    return null;
  }
}

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
    const decoded = jwt.verify(token, config.jwt.secret);

    if (typeof decoded === 'string' || !decoded.userId) {
      reply.status(401).send({ ok: false, error: 'Invalid token' });
      return;
    }

    request.userId = decoded.userId;
  } catch (error) {
    reply.status(401).send({ ok: false, error: 'Invalid token' });
  }
}
