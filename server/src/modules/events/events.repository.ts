import { FastifyInstance } from 'fastify';
import { db } from '@/db/db.instance';
import { events } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

export interface EventData {
  projectId?: string | null;
  userId: string;
  eventType: string;
  eventData: Record<string, any>;
}

export interface EventsRepository {
  storeEvents(eventsToStore: EventData[]): Promise<void>;
  getEventsByUserId(userId: string): Promise<any[]>;
  getEventsByProjectId(projectId: string): Promise<any[]>;
}

export class EventsRepositoryImpl implements EventsRepository {
  constructor(private readonly app: FastifyInstance) {}

  async storeEvents(eventsToStore: EventData[]): Promise<void> {
    try {
      const eventData = eventsToStore.map((event) => ({
        projectId: event.projectId || null,
        userId: event.userId,
        eventType: event.eventType,
        eventData: event.eventData || {},
      }));

      await db.insert(events).values(eventData);
      this.app.log.info({ count: eventsToStore.length }, '이벤트 저장 완료');
    } catch (error) {
      this.app.log.error(error, '이벤트 저장 실패');
      throw new Error('이벤트 저장에 실패했습니다.');
    }
  }

  async getEventsByUserId(userId: string): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(events)
        .where(eq(events.userId, userId))
        .orderBy(desc(events.createdAt));

      return result;
    } catch (error) {
      this.app.log.error(error, '사용자 이벤트 조회 실패');
      throw new Error('사용자 이벤트 조회에 실패했습니다.');
    }
  }

  async getEventsByProjectId(projectId: string): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(events)
        .where(eq(events.projectId, projectId))
        .orderBy(desc(events.createdAt));

      return result;
    } catch (error) {
      this.app.log.error(error, '프로젝트 이벤트 조회 실패');
      throw new Error('프로젝트 이벤트 조회에 실패했습니다.');
    }
  }
}
