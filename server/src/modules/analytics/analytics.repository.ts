import { FastifyInstance } from 'fastify';
import { db } from '@/db/db.instance';
import { events, projects } from '@/drizzle/schema';
import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import {
  AnalyticsEvent,
  AnalyticsMetrics,
  AnalyticsFilter,
  AnalyticsRepository,
} from './analytics.types';

export class AnalyticsRepositoryImpl implements AnalyticsRepository {
  constructor(private readonly app: FastifyInstance) {}

  async getEventsByProjectId(
    projectId: string,
    filter?: AnalyticsFilter
  ): Promise<AnalyticsEvent[]> {
    try {
      const conditions: any[] = [eq(events.projectId, projectId)];
      if (filter?.startDate) {
        conditions.push(gte(events.timestamp, filter.startDate));
      }
      if (filter?.endDate) {
        conditions.push(lte(events.timestamp, filter.endDate));
      }
      if (filter?.eventTypes && filter.eventTypes.length > 0) {
        conditions.push(sql`${events.eventType} = ANY(${filter.eventTypes})`);
      }

      const whereExpr = conditions.reduce(
        (acc, cond) => (acc ? and(acc, cond) : cond),
        undefined as any
      );

      const rows = await db
        .select({
          id: events.id,
          userId: events.userId,
          projectId: events.projectId,
          eventType: events.eventType,
          eventData: events.eventData,
          metadata: events.metadata,
          timestamp: events.timestamp,
          createdAt: events.createdAt,
        })
        .from(events)
        .where(whereExpr)
        .orderBy(desc(events.timestamp));

      const result = rows.map((row) => ({
        ...row,
        projectId: row.projectId ?? undefined,
        eventData: (row.eventData as any) ?? {},
        metadata: (row.metadata as any) ?? undefined,
      }));

      this.app.log.info(
        { projectId, count: result.length },
        '프로젝트 이벤트 조회 완료'
      );
      return result as any;
    } catch (error) {
      this.app.log.error(error, '프로젝트 이벤트 조회 실패');
      throw new Error('프로젝트 이벤트 조회에 실패했습니다.');
    }
  }

  async getEventsByUserId(
    userId: string,
    filter?: AnalyticsFilter
  ): Promise<AnalyticsEvent[]> {
    try {
      const conditions: any[] = [eq(events.userId, userId)];
      if (filter?.startDate) {
        conditions.push(gte(events.timestamp, filter.startDate));
      }
      if (filter?.endDate) {
        conditions.push(lte(events.timestamp, filter.endDate));
      }
      if (filter?.eventTypes && filter.eventTypes.length > 0) {
        conditions.push(sql`${events.eventType} = ANY(${filter.eventTypes})`);
      }

      const whereExpr = conditions.reduce(
        (acc, cond) => (acc ? and(acc, cond) : cond),
        undefined as any
      );

      const rows = await db
        .select({
          id: events.id,
          userId: events.userId,
          projectId: events.projectId,
          eventType: events.eventType,
          eventData: events.eventData,
          metadata: events.metadata,
          timestamp: events.timestamp,
          createdAt: events.createdAt,
        })
        .from(events)
        .where(whereExpr)
        .orderBy(desc(events.timestamp));

      const result = rows.map((row) => ({
        ...row,
        projectId: row.projectId ?? undefined,
        eventData: (row.eventData as any) ?? {},
        metadata: (row.metadata as any) ?? undefined,
      }));

      this.app.log.info(
        { userId, count: result.length },
        '사용자 이벤트 조회 완료'
      );
      return result as any;
    } catch (error) {
      this.app.log.error(error, '사용자 이벤트 조회 실패');
      throw new Error('사용자 이벤트 조회에 실패했습니다.');
    }
  }

  async getProjectMetrics(
    projectId: string,
    filter?: AnalyticsFilter
  ): Promise<AnalyticsMetrics> {
    try {
      const conditions: any[] = [eq(events.projectId, projectId)];
      if (filter?.startDate) {
        conditions.push(gte(events.timestamp, filter.startDate));
      }
      if (filter?.endDate) {
        conditions.push(lte(events.timestamp, filter.endDate));
      }
      const whereExpr = conditions.reduce(
        (acc, cond) => (acc ? and(acc, cond) : cond),
        undefined as any
      );

      const allEvents = await db.select().from(events).where(whereExpr);

      const totalViews = allEvents.filter(
        (e) => e.eventType === 'view:page'
      ).length;
      const totalClicks = allEvents.filter(
        (e) => e.eventType === 'click:cta'
      ).length;
      const uniqueVisitors = new Set(allEvents.map((e) => e.userId)).size;

      // 평균 세션 지속 시간 계산 (간단한 구현)
      const sessionEvents = allEvents.filter(
        (e) => e.eventType === 'view:page'
      );
      const averageSessionDuration = sessionEvents.length > 0 ? 300 : 0; // 기본값 5분

      // 전환율 계산 (클릭/뷰 비율)
      const conversionRate =
        totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      // 상위 페이지 계산
      const pageViews = allEvents.filter((e) => e.eventType === 'view:page');
      const pageCounts = pageViews.reduce(
        (acc, event) => {
          const path = (event.eventData as any)?.path || 'unknown';
          acc[path] = (acc[path] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const topPages = Object.entries(pageCounts)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // 상위 이벤트 계산
      const eventCounts = allEvents.reduce(
        (acc, event) => {
          acc[event.eventType] = (acc[event.eventType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const topEvents = Object.entries(eventCounts)
        .map(([eventType, count]) => ({ eventType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const metrics: AnalyticsMetrics = {
        totalViews,
        totalClicks,
        uniqueVisitors,
        averageSessionDuration,
        conversionRate,
        topPages,
        topEvents,
      };

      this.app.log.info({ projectId, metrics }, '프로젝트 메트릭 계산 완료');
      return metrics;
    } catch (error) {
      this.app.log.error(error, '프로젝트 메트릭 계산 실패');
      throw new Error('프로젝트 메트릭 계산에 실패했습니다.');
    }
  }

  async getUserMetrics(
    userId: string,
    filter?: AnalyticsFilter
  ): Promise<AnalyticsMetrics> {
    try {
      const conditions: any[] = [eq(events.userId, userId)];
      if (filter?.startDate) {
        conditions.push(gte(events.timestamp, filter.startDate));
      }
      if (filter?.endDate) {
        conditions.push(lte(events.timestamp, filter.endDate));
      }
      const whereExpr = conditions.reduce(
        (acc, cond) => (acc ? and(acc, cond) : cond),
        undefined as any
      );

      const allEvents = await db.select().from(events).where(whereExpr);

      const totalViews = allEvents.filter(
        (e) => e.eventType === 'view:page'
      ).length;
      const totalClicks = allEvents.filter(
        (e) => e.eventType === 'click:cta'
      ).length;
      const uniqueVisitors = 1; // 사용자별 메트릭이므로 항상 1
      const averageSessionDuration = allEvents.length > 0 ? 300 : 0;
      const conversionRate =
        totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      const pageViews = allEvents.filter((e) => e.eventType === 'view:page');
      const pageCounts = pageViews.reduce(
        (acc, event) => {
          const path = (event.eventData as any)?.path || 'unknown';
          acc[path] = (acc[path] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const topPages = Object.entries(pageCounts)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      const eventCounts = allEvents.reduce(
        (acc, event) => {
          acc[event.eventType] = (acc[event.eventType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const topEvents = Object.entries(eventCounts)
        .map(([eventType, count]) => ({ eventType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const metrics: AnalyticsMetrics = {
        totalViews,
        totalClicks,
        uniqueVisitors,
        averageSessionDuration,
        conversionRate,
        topPages,
        topEvents,
      };

      this.app.log.info({ userId, metrics }, '사용자 메트릭 계산 완료');
      return metrics;
    } catch (error) {
      this.app.log.error(error, '사용자 메트릭 계산 실패');
      throw new Error('사용자 메트릭 계산에 실패했습니다.');
    }
  }

  async getTopPages(
    projectId: string,
    limit: number = 10
  ): Promise<Array<{ path: string; views: number }>> {
    try {
      const pageViews = await db
        .select({
          path: sql<string>`${events.eventData}->>'path'`,
          views: sql<number>`COUNT(*)`,
        })
        .from(events)
        .where(
          and(
            eq(events.projectId, projectId),
            eq(events.eventType, 'view:page')
          )
        )
        .groupBy(sql`${events.eventData}->>'path'`)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(limit);

      this.app.log.info(
        { projectId, count: pageViews.length },
        '상위 페이지 조회 완료'
      );
      return pageViews;
    } catch (error) {
      this.app.log.error(error, '상위 페이지 조회 실패');
      throw new Error('상위 페이지 조회에 실패했습니다.');
    }
  }

  async getTopEvents(
    projectId: string,
    limit: number = 10
  ): Promise<Array<{ eventType: string; count: number }>> {
    try {
      const eventCounts = await db
        .select({
          eventType: events.eventType,
          count: sql<number>`COUNT(*)`,
        })
        .from(events)
        .where(eq(events.projectId, projectId))
        .groupBy(events.eventType)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(limit);

      this.app.log.info(
        { projectId, count: eventCounts.length },
        '상위 이벤트 조회 완료'
      );
      return eventCounts;
    } catch (error) {
      this.app.log.error(error, '상위 이벤트 조회 실패');
      throw new Error('상위 이벤트 조회에 실패했습니다.');
    }
  }

  async getEventTrends(
    projectId: string,
    days: number = 30
  ): Promise<Array<{ date: string; count: number }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trends = await db
        .select({
          date: sql<string>`DATE(${events.timestamp})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(events)
        .where(
          and(
            eq(events.projectId, projectId),
            gte(events.timestamp, startDate.toISOString())
          )
        )
        .groupBy(sql`DATE(${events.timestamp})`)
        .orderBy(asc(sql`DATE(${events.timestamp})`));

      this.app.log.info(
        { projectId, days, count: trends.length },
        '이벤트 트렌드 조회 완료'
      );
      return trends;
    } catch (error) {
      this.app.log.error(error, '이벤트 트렌드 조회 실패');
      throw new Error('이벤트 트렌드 조회에 실패했습니다.');
    }
  }
}
