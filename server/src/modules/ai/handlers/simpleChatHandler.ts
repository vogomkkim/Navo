import { actionRouter } from '@/core/actionRouter';
import { contextManager } from '@/core/contextManager';
import { intentAnalyzer } from '@/core/intentAnalyzer';

import type { FastifyRequest, FastifyReply } from 'fastify';

export async function handleSimpleChat(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = (request as any).userId as string | undefined;
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const { message } = (request.body as any) ?? {};
    if (!message || typeof message !== 'string') {
      reply.status(400).send({ error: 'Message is required' });
      return;
    }

    const userContext = contextManager.getOrCreateContext(userId);
    const recent = await contextManager.getMessages(userContext.sessionId, 3);

    const enhanced = await intentAnalyzer.enhance(message, userContext, recent);
    const handler = actionRouter.route(enhanced);

    if (!handler) {
      reply.send({ success: false, message: '핸들러를 찾을 수 없습니다.' });
      return;
    }

    const result = await handler.execute(
      enhanced,
      userContext,
      userContext.sessionId
    );

    await contextManager.addMessage(userContext.sessionId, userId, 'user', {
      message,
    });
    await contextManager.addMessage(
      userContext.sessionId,
      userId,
      'assistant',
      { message: result.message }
    );

    reply.send({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch {
    reply.status(500).send({ error: 'Internal server error' });
  }
}
