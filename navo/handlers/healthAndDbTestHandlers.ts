import { Request, Response } from 'express';
import { client, db } from '../db/db.js';
import { users, projects, suggestions } from '../db/schema.js';
import { sql } from 'drizzle-orm';

export async function handleHealthCheck(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Test database connection
    await client`SELECT 1`;

    res.json({
      ok: true,
      status: 'healthy',
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function handleDbTest(req: Request, res: Response): Promise<void> {
  try {
    // Test database operations
    const [{ count: userCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const [{ count: projectCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects);
    const [{ count: suggestionCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(suggestions);

    res.json({
      ok: true,
      message: 'Database test successful',
      counts: {
        users: Number(userCount),
        projects: Number(projectCount),
        suggestions: Number(suggestionCount),
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
