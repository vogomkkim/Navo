/*
 * Simple Chat Handler
 * 새로운 의도 기반 에이전트 시스템을 사용하는 간단한 채팅 핸들러
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { contextManager, UserContext } from '../core/contextManager.js';
import { intentBasedAgentSystem } from '../core/agents/intentBasedAgent.js';

// FastifyRequest 타입 확장
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

/**
 * 간단한 채팅 핸들러
 * 의도 기반 에이전트 시스템을 사용하여 사용자 요청을 처리
 */
export async function handleSimpleChat(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const { message } = request.body as { message?: string };

    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length === 0
    ) {
      reply.status(400).send({ error: 'Message is required' });
      return;
    }

    // 1. 사용자 컨텍스트 조회 또는 생성
    const userContext: UserContext =
      await contextManager.getOrCreateContext(userId);
    const sessionId = userContext.sessionId;

    // 2. 사용자 메시지를 대화 히스토리에 추가
    await contextManager.addMessage(
      sessionId,
      userId,
      'user',
      { message },
      undefined,
      undefined,
      {
        source: 'simple_chat',
        timestamp: new Date(),
      }
    );

    // 3. 의도 기반 에이전트 시스템으로 처리
    const result = await intentBasedAgentSystem.execute(
      message,
      userContext,
      sessionId
    );

    // 4. 어시스턴트 응답을 대화 히스토리에 추가
    await contextManager.addMessage(
      sessionId,
      userId,
      'assistant',
      { message: result.message },
      undefined,
      undefined,
      {
        source: 'simple_chat',
        agentType: result.type,
        executionTime: result.metadata?.executionTime || 0,
        timestamp: new Date(),
      }
    );

    // 5. 응답 반환
    reply.send({
      success: result.success,
      message: result.message,
      type: result.type,
      data: result.data,
      metadata: {
        executionTime: result.metadata?.executionTime || 0,
        model: result.metadata?.model || 'gemini-2.5-flash',
        sessionId: sessionId,
      },
    });
  } catch (error) {
    console.error('Error handling simple chat:', error);
    reply.status(500).send({
      success: false,
      message: '죄송합니다. 요청 처리 중 오류가 발생했습니다.',
      type: 'text',
    });
  }
}
