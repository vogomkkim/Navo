import { Request, Response } from 'express';
import { prisma } from '../db/db.js';

export async function handleEvents(req: Request, res: Response): Promise<void> {
  console.log('[HANDLER] Entering handleEvents', { body: req.body });
  const body = req.body || {};
  const events = Array.isArray(body)
    ? body
    : Array.isArray(body?.events)
      ? body.events
      : [body];

  try {
    for (const event of events) {
      const { type, ...data } = event; // Extract type and rest of the event as data
      console.log('[HANDLER] Inserting event:', { type, data });
      await prisma.events.create({
        data: {
          type,
          data,
        },
      });
    }
    res.json({ ok: true, received: events.length });
    console.log('[HANDLER] Exiting handleEvents', {
      received: events.length,
    });
  } catch (err) {
    console.error('[HANDLER] Error inserting events:', err, {
      eventsToInsert: events,
    });
    res.status(500).json({ ok: false, error: 'Failed to store events' });
  }
}

export async function handleAnalyticsEvents(
  req: Request,
  res: Response
): Promise<void> {
  const { projectId, eventType, limit = 100, offset = 0 } = req.query;
  const userId = 'dummy-user-id'; // Temporary hardcoded userId for testing

  try {
    const events = await prisma.events.findMany({
      where: {
        project_id: (projectId as string) || undefined,
        user_id: userId,
        type: (eventType as string) || undefined,
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { ts: 'desc' },
    });

    res.json({ events });
  } catch (error) {
    console.error('Error fetching analytics events:', error);
    res.status(500).json({ error: 'Failed to fetch analytics events' });
  }
}
