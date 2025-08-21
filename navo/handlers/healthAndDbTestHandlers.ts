import { Request, Response } from 'express';
import { prisma } from '../db/db.js';

export async function handleHealthCheck(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function handleDbTest(req: Request, res: Response): Promise<void> {
  try {
    // Test database operations
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const suggestionCount = await prisma.suggestion.count();

    res.json({
      ok: true,
      message: 'Database test successful',
      counts: {
        users: userCount,
        projects: projectCount,
        suggestions: suggestionCount,
      },
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      ok: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
