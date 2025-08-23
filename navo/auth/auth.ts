import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword as hashWithScrypt, verifyPassword as verifyWithScrypt } from './password.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function handleRegister(
  req: Request,
  res: Response
): Promise<void> {
  console.log('[AUTH] Entering handleRegister');

  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res
        .status(400)
        .json({ ok: false, error: 'Email and password are required' });
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
      res.status(400).json({ ok: false, error: 'User already exists' });
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

    res.json({ ok: true, user });
  } catch (error) {
    console.error('[AUTH] Error during registration:', error);
    res.status(500).json({ ok: false, error: 'Registration failed' });
  }
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res
        .status(400)
        .json({ ok: false, error: 'Email and password are required' });
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
      res.status(401).json({ ok: false, error: 'Invalid credentials' });
      return;
    }

    // Check password (supports scrypt and legacy bcrypt hashes)
    const verify = await verifyWithScrypt(password, user.password);
    if (!verify.ok) {
      res.status(401).json({ ok: false, error: 'Invalid credentials' });
      return;
    }
    // If legacy bcrypt succeeded, upgrade hash in-place
    if (verify.needsRehash && verify.newHash) {
      try {
        await db
          .update(users)
          .set({ password: verify.newHash })
          .where(eq(users.id, user.id));
      } catch (e) {
        // Non-fatal; proceed with login
        console.warn('[AUTH] Failed to upgrade password hash:', e);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
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
    res.status(500).json({ ok: false, error: 'Login failed' });
  }
}

export function getUserIdFromToken(
  authHeader: string | undefined
): string | null {
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { userId: string; email: string };

    return decoded.userId;
  } catch (error) {
    return null;
  }
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: () => void
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ ok: false, error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { userId: string; email: string };

    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(403).json({ ok: false, error: 'Invalid token' });
  }
}
