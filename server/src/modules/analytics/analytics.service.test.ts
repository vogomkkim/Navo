

import { vi, type Mock } from 'vitest';
import { ProjectsRepositoryImpl } from '../projects/projects.repository';
import { AnalyticsRepositoryImpl } from './analytics.repository';
import { AnalyticsService } from './analytics.service';

vi.mock('./analytics.repository');
vi.mock('../projects/projects.repository');

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockApp: any;
  let mockRepo: any;
  let mockProjectsRepo: any;

  beforeEach(() => {
    mockApp = { log: { error: vi.fn() } } as any;
    mockRepo = {
      getEventsByProjectId: vi.fn(),
      getEventsByUserId: vi.fn(),
      getProjectMetrics: vi.fn(),
      getUserMetrics: vi.fn(),
      getTopPages: vi.fn(),
      getTopEvents: vi.fn(),
      getEventTrends: vi.fn(),
    };
    mockProjectsRepo = { getProjectByUserId: vi.fn() };
    (AnalyticsRepositoryImpl as Mock).mockImplementation(() => mockRepo);
    (ProjectsRepositoryImpl as Mock).mockImplementation(() => mockProjectsRepo);
    service = new AnalyticsService(mockApp);
  });

  it('gets project events with ownership check', async () => {
    mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
    const events = [{ id: 'e1' } as any];
    mockRepo.getEventsByProjectId.mockResolvedValue(events);
    const result = await service.getProjectEvents('p1', 'u1');
    expect(result).toEqual(events);
  });

  it('gets user events', async () => {
    const events = [{ id: 'e1' } as any];
    mockRepo.getEventsByUserId.mockResolvedValue(events);
    const result = await service.getUserEvents('u1');
    expect(result).toEqual(events);
  });

  it('gets project metrics with ownership check', async () => {
    mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
    const metrics = { totalViews: 10 } as any;
    mockRepo.getProjectMetrics.mockResolvedValue(metrics);
    const result = await service.getProjectMetrics('p1', 'u1');
    expect(result).toEqual(metrics);
  });

  it('gets user metrics', async () => {
    const metrics = { totalViews: 10 } as any;
    mockRepo.getUserMetrics.mockResolvedValue(metrics);
    const result = await service.getUserMetrics('u1');
    expect(result).toEqual(metrics);
  });

  it('gets top pages/events and trends and dashboard data', async () => {
    mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
    const metrics = { totalViews: 10 } as any;
    const topPages = [{ path: '/a', views: 3 }];
    const topEvents = [{ eventType: 'click', count: 2 }];
    const trends = [{ date: '2024-01-01', count: 1 }];
    mockRepo.getProjectMetrics.mockResolvedValue(metrics);
    mockRepo.getTopPages.mockResolvedValue(topPages as any);
    mockRepo.getTopEvents.mockResolvedValue(topEvents as any);
    mockRepo.getEventTrends.mockResolvedValue(trends as any);

    const result = await service.getDashboardData('p1', 'u1');
    expect(result).toEqual({ metrics, topPages, topEvents, trends });
  });
});
