import { and, desc, eq, lt } from 'drizzle-orm';
import { db } from '@/db/db.instance';
import { chatMessages } from '@/drizzle/schema';
import { CreateChatMessage } from './projects.types';

export class ChatRepository {
  async getMessagesByProjectId(
    projectId: string,
    options: { cursor?: string; limit: number }
  ) {
    const { cursor, limit } = options;

    const query = db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.projectId, projectId),
          cursor ? lt(chatMessages.createdAt, new Date(cursor).toISOString()) : undefined
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    const messages = await query;

    const nextCursor =
      messages.length === limit
        ? messages[messages.length - 1].createdAt
        : null;

    return {
      messages: messages.reverse(), // Return in ascending order for UI
      nextCursor,
    };
  }

  async createMessage(message: CreateChatMessage) {
    const valuesToInsert = {
      ...message,
      createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
    };
    const [newMessage] = await db
      .insert(chatMessages)
      .values(valuesToInsert)
      .returning();
    return newMessage;
  }
}
