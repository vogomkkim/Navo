import { Response } from 'express';
import { db } from '../db/db.js';
import { events } from '../db/schema.js';
import { ErrorResolutionManager } from '../core/errorResolution.js';
import { ErrorAnalyzerAgent } from '../agents/errorAnalyzerAgent.js';
import { CodeFixerAgent } from '../agents/codeFixerAgent.js';
import { TestRunnerAgent } from '../agents/testRunnerAgent.js';
import { RollbackAgent } from '../agents/rollbackAgent.js';
import { AuthenticatedRequest } from '../auth/auth.js';

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

    console.log('🚀 자동 에러 해결 시스템 초기화 완료');
    console.log(
      `📊 등록된 에이전트: ${errorResolutionManager.getStatus().registeredAgents}개`
    );
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

export async function handleEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    console.error('Error storing event:', error);
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
    console.error('Error storing analytics events:', error);
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

    console.log('🚨 Client Error Logged:', {
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
      console.log('🔧 자동 에러 해결 시스템 시작...');
      console.log('📋 에러 정보:', { message, filename, lineno, colno });

      // 에러 해결 시스템 초기화
      console.log('🔄 에러 해결 시스템 초기화 중...');
      const manager = initializeErrorResolutionSystem();
      console.log('✅ 에러 해결 시스템 초기화 완료');

      // 에러 객체 생성
      console.log('🔨 에러 객체 생성 중...');
      const error = new Error(message);
      (error as any).filename = filename;
      (error as any).lineno = lineno;
      (error as any).colno = colno;
      (error as any).stack = stack;
      console.log('✅ 에러 객체 생성 완료:', error.message);

      // 에러 컨텍스트 생성
      console.log('🌍 에러 컨텍스트 생성 중...');
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
      console.log('✅ 에러 컨텍스트 생성 완료:', context);

      // 자동 에러 해결 실행
      console.log('🚀 자동 에러 해결 실행 시작...');
      const resolutionResult = await manager.resolveError(error, context);
      console.log('✅ 자동 에러 해결 실행 완료:', resolutionResult);

      if (resolutionResult.success) {
        console.log('✅ 자동 에러 해결 성공!', {
          changes: resolutionResult.changes.length,
          executionTime: resolutionResult.executionTime,
          nextSteps: resolutionResult.nextSteps,
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
        console.log('❌ 자동 에러 해결 실패:', resolutionResult.errorMessage);

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
      console.error('🚨 자동 에러 해결 시스템 실행 실패:', resolutionError);
      console.error('🚨 에러 스택:', (resolutionError as Error).stack);

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
    console.error('Error logging client error:', error);
    res.status(500).json({ error: 'Failed to log error' });
  }
}
