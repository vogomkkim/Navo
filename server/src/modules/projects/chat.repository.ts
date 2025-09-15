import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db/db.instance";
import { chatMessages } from "@/drizzle/schema";
import { CreateChatMessage } from "./projects.types";

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
          cursor
            ? lt(chatMessages.createdAt, new Date(cursor).toISOString())
            : undefined
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    const messages = await query; // DESC (최신 → 과거)

    const nextCursor =
      messages.length === limit
        ? messages[messages.length - 1].createdAt // 이번 페이지의 가장 오래된 createdAt
        : null;

    // 서버는 항상 DESC로 반환한다. 프론트는 표시 직전에 한 번만 reverse하여 오름차순으로 렌더링한다.
    return {
      messages,
      nextCursor,
    };
  }

  async createMessage(message: CreateChatMessage) {
    const valuesToInsert = {
      ...message,
      createdAt: message.createdAt
        ? new Date(message.createdAt).toISOString()
        : new Date().toISOString(),
    };
    const [newMessage] = await db
      .insert(chatMessages)
      .values(valuesToInsert)
      .returning();
    return newMessage;
  }
}
