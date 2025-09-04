// Analytics 모듈 공통 타입 정의

export interface AnalyticsEvent {
  id: string;
  userId: string;
  projectId?: string;
  eventType: string;
  eventData: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
  createdAt: string;
}

export interface AnalyticsMetrics {
  totalViews: number;
  totalClicks: number;
  uniqueVisitors: number;
  averageSessionDuration: number;
  conversionRate: number;
  topPages: Array<{ path: string; views: number }>;
  topEvents: Array<{ eventType: string; count: number }>;
}

export interface AnalyticsFilter {
  projectId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  eventTypes?: string[];
}

export interface AnalyticsRepository {
  getEventsByProjectId(
    projectId: string,
    filter?: AnalyticsFilter,
  ): Promise<AnalyticsEvent[]>;
  getEventsByUserId(
    userId: string,
    filter?: AnalyticsFilter,
  ): Promise<AnalyticsEvent[]>;
  getProjectMetrics(
    projectId: string,
    filter?: AnalyticsFilter,
  ): Promise<AnalyticsMetrics>;
  getUserMetrics(
    userId: string,
    filter?: AnalyticsFilter,
  ): Promise<AnalyticsMetrics>;
  getTopPages(
    projectId: string,
    limit?: number,
  ): Promise<Array<{ path: string; views: number }>>;
  getTopEvents(
    projectId: string,
    limit?: number,
  ): Promise<Array<{ eventType: string; count: number }>>;
  getEventTrends(
    projectId: string,
    days: number,
  ): Promise<Array<{ date: string; count: number }>>;
}
