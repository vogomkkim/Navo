import { Response } from 'express';
import { db } from '../db/db.js';
import { events } from '../db/schema.js';
import { ErrorResolutionManager } from '../core/errorResolution.js';
import { ErrorAnalyzerAgent } from '../agents/errorAnalyzerAgent.js';
import { CodeFixerAgent } from '../agents/codeFixerAgent.js';
import { TestRunnerAgent } from '../agents/testRunnerAgent.js';
import { RollbackAgent } from '../agents/rollbackAgent.js';
import { AuthenticatedRequest } from '../auth/auth.js';
import logger from '../core/logger.js';

// 에러 해결 관리자 인스턴스 (싱글톤)
let errorResolutionManager: ErrorResolutionManager | null = null;

// 에러 해결 시스템 초기화
function initializeErrorResolutionSystem() {
  if (!errorResolutionManager) {
    errorResolutionManager = new ErrorResolutionManager();

    // 모든 에이전트 등록
    const analyzerAgent = new ErrorAnalyzerAgent();
    const codeFixerAgent = new CodeFixerAgent();
    const testRunnerAgent = new TestRunnerAgent();
    const rollbackAgent = new RollbackAgent();

    errorResolutionManager.registerAgent(analyzerAgent);
    errorResolutionManager.registerAgent(codeFixerAgent);
    errorResolutionManager.registerAgent(testRunnerAgent);
    errorResolutionManager.registerAgent(rollbackAgent);

    logger.info('자동 에러 해결 시스템 초기화 완료');
    logger.info('등록된 에이전트 수', {
      count: errorResolutionManager.getStatus().registeredAgents,
    });
  }
  return errorResolutionManager;
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

export async function handleEvents(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { type, data, projectId } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!type) {
      res.status(400).json({ error: 'Event type is required' });
      return;
    }

    await storeEvents([{ type, data, projectId }], userId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error storing event', error);
    res.status(500).json({ error: 'Failed to store event' });
  }
}

export async function handleAnalyticsEvents(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { events: payload } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!Array.isArray(payload)) {
      res.status(400).json({ error: 'Events array is required' });
      return;
    }

    await storeEvents(payload, userId);

    res.json({ success: true, count: payload.length });
  } catch (error) {
    logger.error('Error storing analytics events', error);
    res.status(500).json({ error: 'Failed to store analytics events' });
  }
}

/**
 * Handle client-side error logging
 * POST body: { type, message, filename, lineno, colno, stack, url, userAgent, timestamp }
 */
export async function handleLogError(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const {
      type,
      message,
      filename,
      lineno,
      colno,
      stack,
      url,
      userAgent,
      timestamp,
    } = req.body;

    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    logger.warn('Client Error Logged', {
      type,
      message,
      filename,
      lineno,
      colno,
      url,
      timestamp,
    });

    const errorEvent = {
      type: 'client_error',
      data: {
        error_type: type,
        message,
        filename,
        lineno,
        colno,
        stack,
        url,
        userAgent,
        timestamp,
      },
      projectId: null, // No project context for client errors
    };

    await storeEvents([errorEvent], userId);

    // 🚀 자동 에러 해결 시스템 실행!
    try {
      logger.info('자동 에러 해결 시스템 시작');
      logger.debug('에러 정보', { message, filename, lineno, colno });

      // 에러 해결 시스템 초기화
      logger.debug('에러 해결 시스템 초기화 중');
      const manager = initializeErrorResolutionSystem();
      logger.debug('에러 해결 시스템 초기화 완료');

      // 에러 객체 생성
      logger.debug('에러 객체 생성 중');
      const error = new Error(message);
      (error as any).filename = filename;
      (error as any).lineno = lineno;
      (error as any).colno = colno;
      (error as any).stack = stack;
      logger.debug('에러 객체 생성 완료', { message: error.message });

      // 에러 컨텍스트 생성
      logger.debug('에러 컨텍스트 생성 중');
      const context = {
        timestamp: new Date(timestamp || Date.now()),
        userAgent: userAgent || 'Unknown',
        url: url || 'Unknown',
        sessionId: `session-${Date.now()}`,
        metadata: {
          filename,
          lineno,
          colno,
          stack,
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
        res.json({
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
        res.json({
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
      res.json({
        success: true,
        logged: true,
        autoResolved: false,
        error: '자동 에러 해결 시스템 실행 실패',
        fallback: '에러는 로깅되었지만 자동 해결은 실패했습니다',
      });
    }
  } catch (error) {
    logger.error('Error logging client error', error);
    res.status(500).json({ error: 'Failed to log error' });
  }
}
