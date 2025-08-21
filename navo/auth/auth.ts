import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { prisma } from '../db/db.js';

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
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ ok: false, error: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

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
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      res.status(401).json({ ok: false, error: 'Invalid credentials' });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ ok: false, error: 'Invalid credentials' });
      return;
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
