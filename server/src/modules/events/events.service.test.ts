import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EventsService } from './events.service';
import { EventsRepositoryImpl } from './events.repository';

// Mock dependencies
jest.mock('./events.repository.js');

describe('EventsService', () => {
  let eventsService: EventsService;
  let mockApp: any;
  let mockRepository: any;

  beforeEach(() => {
    // Mock Fastify app
    mockApp = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
    };

    // Mock repository
    mockRepository = {
      storeEvents: jest.fn(),
      getEventsByUserId: jest.fn(),
      getEventsByProjectId: jest.fn(),
    };

    jest.mocked(EventsRepositoryImpl).mockImplementation(() => mockRepository);

    eventsService = new EventsService(mockApp);
  });

  describe('storeUserEvents', () => {
    it('should store user events successfully', async () => {
      // Arrange
      const eventsArray = [
        {
          type: 'page_view',
          data: { page: '/home' },
          projectId: 'project-123',
        },
        {
          type: 'button_click',
          data: { button: 'submit' },
          projectId: 'project-123',
        },
      ];
      const userId = 'user-123';

      mockRepository.storeEvents.mockResolvedValue(undefined);

      // Act
      const result = await eventsService.storeUserEvents(eventsArray, userId);

      // Assert
      expect(result).toBe(2);
      expect(mockRepository.storeEvents).toHaveBeenCalledWith([
        {
          projectId: 'project-123',
          userId: 'user-123',
          eventType: 'page_view',
          eventData: { page: '/home' },
        },
        {
          projectId: 'project-123',
          userId: 'user-123',
          eventType: 'button_click',
          eventData: { button: 'submit' },
        },
      ]);
    });

    it('should handle errors during event storage', async () => {
      // Arrange
      const eventsArray = [
        {
          type: 'page_view',
          data: { page: '/home' },
        },
      ];
      const userId = 'user-123';

      mockRepository.storeEvents.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(eventsService.storeUserEvents(eventsArray, userId)).rejects.toThrow(
        '사용자 이벤트 저장에 실패했습니다.'
      );
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('storeErrorEvent', () => {
    it('should store error event successfully', async () => {
      // Arrange
      const errorData = {
        type: 'TypeError',
        message: 'Cannot read property of undefined',
        filename: 'app.js',
        lineno: 42,
        colno: 10,
        stack: 'Error stack trace',
        url: 'https://example.com',
        userAgent: 'Mozilla/5.0',
        timestamp: '2024-12-19T10:00:00Z',
      };
      const userId = 'user-123';

      mockRepository.storeEvents.mockResolvedValue(undefined);

      // Act
      await eventsService.storeErrorEvent(errorData, userId);

      // Assert
      expect(mockRepository.storeEvents).toHaveBeenCalledWith([
        {
          projectId: null,
          userId: 'user-123',
          eventType: 'client_error',
          eventData: {
            error_type: 'TypeError',
            message: 'Cannot read property of undefined',
            filename: 'app.js',
            lineno: 42,
            colno: 10,
            stack: 'Error stack trace',
            url: 'https://example.com',
            userAgent: 'Mozilla/5.0',
            timestamp: '2024-12-19T10:00:00Z',
          },
        },
      ]);
    });

    it('should handle errors during error event storage', async () => {
      // Arrange
      const errorData = {
        message: 'Test error',
      };
      const userId = 'user-123';

      mockRepository.storeEvents.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(eventsService.storeErrorEvent(errorData, userId)).rejects.toThrow(
        '에러 이벤트 저장에 실패했습니다.'
      );
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('getUserEvents', () => {
    it('should return user events successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockEvents = [
        {
          id: 'event-1',
          userId: 'user-123',
          eventType: 'page_view',
          eventData: { page: '/home' },
          createdAt: '2024-12-19T10:00:00Z',
        },
        {
          id: 'event-2',
          userId: 'user-123',
          eventType: 'button_click',
          eventData: { button: 'submit' },
          createdAt: '2024-12-19T10:01:00Z',
        },
      ];

      mockRepository.getEventsByUserId.mockResolvedValue(mockEvents);

      // Act
      const result = await eventsService.getUserEvents(userId);

      // Assert
      expect(result).toEqual(mockEvents);
      expect(mockRepository.getEventsByUserId).toHaveBeenCalledWith(userId);
    });

    it('should handle errors during user events retrieval', async () => {
      // Arrange
      const userId = 'user-123';

      mockRepository.getEventsByUserId.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(eventsService.getUserEvents(userId)).rejects.toThrow(
        '사용자 이벤트 조회에 실패했습니다.'
      );
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('getProjectEvents', () => {
    it('should return project events successfully', async () => {
      // Arrange
      const projectId = 'project-123';
      const mockEvents = [
        {
          id: 'event-1',
          projectId: 'project-123',
          eventType: 'page_view',
          eventData: { page: '/home' },
          createdAt: '2024-12-19T10:00:00Z',
        },
      ];

      mockRepository.getEventsByProjectId.mockResolvedValue(mockEvents);

      // Act
      const result = await eventsService.getProjectEvents(projectId);

      // Assert
      expect(result).toEqual(mockEvents);
      expect(mockRepository.getEventsByProjectId).toHaveBeenCalledWith(projectId);
    });

    it('should handle errors during project events retrieval', async () => {
      // Arrange
      const projectId = 'project-123';

      mockRepository.getEventsByProjectId.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(eventsService.getProjectEvents(projectId)).rejects.toThrow(
        '프로젝트 이벤트 조회에 실패했습니다.'
      );
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });
});
