import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/db.js';
import { events } from '../db/schema.js';
import { MasterDeveloperManager } from '../core/masterDeveloper.js';
import { ProjectArchitectAgent } from '../agents/projectArchitectAgent.js';
import { CodeGeneratorAgent } from '../agents/codeGeneratorAgent.js';
import { DevelopmentGuideAgent } from '../agents/developmentGuideAgent.js';
import { RollbackAgent } from '../agents/rollbackAgent.js';
import logger from '../core/logger.js';

// 마스터 개발자 관리자 인스턴스 (싱글톤)
let masterDeveloperManager: MasterDeveloperManager | null = null;

// 에러 해결 시스템 초기화
function initializeMasterDeveloperSystem() {
  if (!masterDeveloperManager) {
    masterDeveloperManager = new MasterDeveloperManager();

    // 모든 에이전트 등록
    const projectArchitectAgent = new ProjectArchitectAgent("Project Architect", 1);
    const codeGeneratorAgent = new CodeGeneratorAgent("Code Generator", 2);
    const developmentGuideAgent = new DevelopmentGuideAgent("Development Guide", 3);
    const rollbackAgent = new RollbackAgent();

    masterDeveloperManager.registerAgent(projectArchitectAgent);
    masterDeveloperManager.registerAgent(codeGeneratorAgent);
    masterDeveloperManager.registerAgent(developmentGuideAgent);
    masterDeveloperManager.registerAgent(rollbackAgent);

    logger.info('자동 에러 해결 시스템 초기화 완료');
    logger.info('등록된 에이전트 수', {
      count: masterDeveloperManager.getStatus().registeredAgents,
    });
  }
  return masterDeveloperManager;
}

async function storeEvents(eventsToStore: any[], userId: string) {
  const eventData = eventsToStore.map((event) => ({
    projectId: event.projectId || null,
    userId,
    type: event.type,
    data: event.data || {},
  }));

  await db.insert(events).values(eventData);
}

// 🚀 통합된 이벤트 핸들러 함수 - 배열 이벤트만 처리
export async function handleUnifiedEvents(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: 'User not authenticated' });
      return;
    }

    const { events: eventsArray, ...otherFields } = request.body as any;

    // 이벤트 배열 형식 처리
    if (eventsArray && Array.isArray(eventsArray)) {
      if (eventsArray.length === 0) {
        reply.status(400).send({ error: 'Events array cannot be empty' });
        return;
      }

      // 각 이벤트의 타입 검증
      for (const event of eventsArray) {
        if (!event.type) {
          reply
            .status(400)
            .send({ error: 'Event type is required for all events' });
          return;
        }
      }

      await storeEvents(eventsArray, userId);
      reply.send({ success: true, count: eventsArray.length });
      return;
    }

    // 클라이언트 에러 로깅 처리
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

      // 🚀 자동 에러 해결 시스템 실행!
      try {
        logger.info('자동 에러 해결 시스템 시작');
        logger.debug('에러 정보', {
          message: otherFields.message,
          filename: otherFields.filename,
          lineno: otherFields.lineno,
          colno: otherFields.colno,
        });

        // 에러 해결 시스템 초기화
        logger.debug('에러 해결 시스템 초기화 중');
        const manager = initializeMasterDeveloperSystem();
        logger.debug('에러 해결 시스템 초기화 완료');

        // 에러 객체 생성
        logger.debug('에러 객체 생성 중');
        const error = new Error(otherFields.message);
        (error as any).filename = otherFields.filename;
        (error as any).lineno = otherFields.lineno;
        (error as any).colno = otherFields.colno;
        (error as any).stack = otherFields.stack;
        logger.debug('에러 객체 생성 완료', { message: error.message });

        // 에러 컨텍스트 생성
        logger.debug('에러 컨텍스트 생성 중');
        const context = {
          timestamp: new Date(otherFields.timestamp || Date.now()),
          userAgent: otherFields.userAgent || 'Unknown',
          url: otherFields.url || 'Unknown',
          sessionId: `session-${Date.now()}`,
          metadata: {
            filename: otherFields.filename,
            lineno: otherFields.lineno,
            colno: otherFields.colno,
            stack: otherFields.stack,
          },
        } as const;
        logger.debug('에러 컨텍스트 생성 완료');

        // 자동 에러 해결 실행
        logger.info('자동 에러 해결 실행 시작');
        const resolutionResult = await manager.resolveError(error, context);
        logger.info('자동 에러 해결 실행 완료');

        if (resolutionResult.success) {
          logger.info('자동 에러 해결 성공', {
            changes: resolutionResult.changes.length,
            executionTime: resolutionResult.executionTime,
          });

          // 클라이언트에게 해결 완료 알림
          reply.send({
            success: true,
            logged: true,
            autoResolved: true,
            changes: resolutionResult.changes.length,
            message: '에러가 자동으로 해결되었습니다!',
          });
        } else {
          logger.warn('자동 에러 해결 실패', {
            error: resolutionResult.errorMessage,
          });

          // 클라이언트에게 해결 실패 알림
          reply.send({
            success: true,
            logged: true,
            autoResolved: false,
            error: resolutionResult.errorMessage,
            nextSteps: resolutionResult.nextSteps,
          });
        }
      } catch (resolutionError) {
        logger.error('자동 에러 해결 시스템 실행 실패', resolutionError);
        logger.error('에러 스택', { stack: (resolutionError as Error).stack });

        // 에러 해결 시스템 실패 시에도 기본 로깅은 성공
        reply.send({
          success: true,
          logged: true,
          autoResolved: false,
          error: '자동 에러 해결 시스템 실행 실패',
          fallback: '에러는 로깅되었지만 자동 해결은 실패했습니다',
        });
      }
      return;
    }

    // 모든 형식이 맞지 않는 경우
    reply.status(400).send({
      error:
        'Invalid event format. Expected events array or error logging fields.',
    });
  } catch (error) {
    logger.error('Error handling unified events', error);
    reply.status(500).send({ error: 'Failed to process events' });
  }
}
