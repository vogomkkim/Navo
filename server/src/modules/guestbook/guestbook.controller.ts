import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../db/db.instance';
import { guestbook } from '@/schema';
import { eq } from 'drizzle-orm';

export const guestbookController = (app: FastifyInstance) => {
  // 특정 프로젝트의 방명록 메시지 조회
  app.get(
    '/:projectId',
    async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
      try {
        const { projectId } = request.params;

        if (!projectId) {
          return reply.status(400).send({ error: 'projectId is required' });
        }

        const messages = await db
          .select()
          .from(guestbook)
          .where(eq(guestbook.projectId, projectId))
          .orderBy(guestbook.createdAt);

        reply.send(messages);
      } catch (error: any) {
        console.error('방명록 메시지 조회 오류:', error);
        reply.status(500).send({ error: error.message });
      }
    }
  );

  // 새 방명록 메시지 작성
  app.post(
    '/',
    async (request: FastifyRequest<{ Body: { projectId: string; message: string; author?: string } }>, reply: FastifyReply) => {
      try {
        const { projectId, message, author } = request.body;

        if (!projectId || !message) {
          return reply.status(400).send({ error: 'projectId and message are required' });
        }

        const [newMessage] = await db
          .insert(guestbook)
          .values({
            projectId,
            message,
            author: author || 'Anonymous',
          })
          .returning();

        reply.status(201).send(newMessage);
      } catch (error: any) {
        console.error('방명록 메시지 작성 오류:', error);
        reply.status(500).send({ error: error.message });
      }
    }
  );
};
