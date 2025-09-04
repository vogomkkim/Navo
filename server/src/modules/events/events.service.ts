import { FastifyInstance } from 'fastify';

import { EventData, EventsRepositoryImpl } from './events.repository';

export interface EventRequest {
  type: string;
  data?: Record<string, any>;
  projectId?: string | null;
}

export interface ErrorEventRequest {
  type?: string;
  message?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
}

export class EventsService {
  private repository: EventsRepositoryImpl;

  constructor(private readonly app: FastifyInstance) {
    this.repository = new EventsRepositoryImpl(app);
  }

  async storeUserEvents(
    eventsArray: EventRequest[],
    userId: string,
  ): Promise<number> {
    try {
      const eventData: EventData[] = eventsArray.map((event) => ({
        projectId: event.projectId || null,
        userId,
        eventType: event.type,
        eventData: event.data || {},
      }));

      await this.repository.storeEvents(eventData);
      return eventsArray.length;
    } catch (error) {
      this.app.log.error(error, '사용자 이벤트 저장 실패');
      throw new Error('사용자 이벤트 저장에 실패했습니다.');
    }
  }

  async storeErrorEvent(
    errorData: ErrorEventRequest,
    userId: string,
  ): Promise<void> {
    try {
      const errorEvent: EventData = {
        projectId: null,
        userId,
        eventType: 'client_error',
        eventData: {
          error_type: errorData.type || 'unknown',
          message: errorData.message,
          filename: errorData.filename,
          lineno: errorData.lineno,
          colno: errorData.colno,
          stack: errorData.stack,
          url: errorData.url,
          userAgent: errorData.userAgent,
          timestamp: errorData.timestamp,
        },
      };

      await this.repository.storeEvents([errorEvent]);
    } catch (error) {
      this.app.log.error(error, '에러 이벤트 저장 실패');
      throw new Error('에러 이벤트 저장에 실패했습니다.');
    }
  }

  async getUserEvents(userId: string): Promise<any[]> {
    try {
      return await this.repository.getEventsByUserId(userId);
    } catch (error) {
      this.app.log.error(error, '사용자 이벤트 조회 실패');
      throw new Error('사용자 이벤트 조회에 실패했습니다.');
    }
  }

  async getProjectEvents(projectId: string): Promise<any[]> {
    try {
      return await this.repository.getEventsByProjectId(projectId);
    } catch (error) {
      this.app.log.error(error, '프로젝트 이벤트 조회 실패');
      throw new Error('프로젝트 이벤트 조회에 실패했습니다.');
    }
  }
}
