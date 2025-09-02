import { FastifyReply, FastifyRequest } from 'fastify';
import { db, events } from '@/modules/db';
import logger from '../../lib/logger';

async function storeEvents(eventsToStore: any[], userId: string) {
  const eventData = eventsToStore.map((event) => ({
    projectId: event.projectId || null,
    userId,
    eventType: event.type,
    eventData: event.data || {},
  }));
  await db.insert(events).values(eventData);
}

export async function handleUnifiedEvents(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = (request as any).userId as string | undefined;
    if (!userId) {
      reply.status(401).send({ error: 'User not authenticated' });
      return;
    }

    const { events: eventsArray, ...otherFields } = request.body as any;
    if (eventsArray && Array.isArray(eventsArray)) {
      if (eventsArray.length === 0) {
        reply.status(400).send({ error: 'Events array cannot be empty' });
        return;
      }
      for (const event of eventsArray) {
        if (!event.type) {
          reply.status(400).send({ error: 'Event type is required for all events' });
          return;
        }
      }
      await storeEvents(eventsArray, userId);
      reply.send({ success: true, count: eventsArray.length });
      return;
    }

    if (otherFields.message || otherFields.filename || otherFields.stack) {
      const errorEvent = {
        type: 'client_error',
        data: {
          error_type: otherFields.type || 'unknown',
          message: otherFields.message,
          filename: otherFields.filename,
          lineno: otherFields.lineno,
          colno: otherFields.colno,
          stack: otherFields.stack,
          url: otherFields.url,
          userAgent: otherFields.userAgent,
          timestamp: otherFields.timestamp,
        },
        projectId: null,
      };
      await storeEvents([errorEvent], userId);
      reply.send({ success: true, logged: true });
      return;
    }

    reply.status(400).send({
      error: 'Invalid event format. Expected events array or error logging fields.',
    });
  } catch (error) {
    logger.error('Error handling unified events', error);
    reply.status(500).send({ error: 'Failed to process events' });
  }
}
