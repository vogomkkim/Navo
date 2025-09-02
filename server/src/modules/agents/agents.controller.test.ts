import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { agentsController } from './agents.controller';
import { AgentsService } from './agents.service';

// Mock dependencies
jest.mock('./agents.service');

describe('AgentsController', () => {
  let mockApp: any;
  let mockAgentsService: any;

  beforeEach(() => {
    // Mock Fastify app
    mockApp = {
      post: jest.fn(),
      get: jest.fn(),
      log: {
        error: jest.fn(),
      },
      authenticateToken: jest.fn(),
    };

    // Mock service
    mockAgentsService = {
      generateProjectPlan: jest.fn(),
      generateVirtualPreview: jest.fn(),
      getProjectPlan: jest.fn(),
    };

    jest.mocked(AgentsService).mockImplementation(() => mockAgentsService);
  });

  describe('POST /api/agents/generate-plan', () => {
    it('should generate project plan successfully', async () => {
      // Arrange
      const mockRequest = {
        body: {
          name: 'Test Project',
          description: 'Test Description',
          type: 'web',
          features: ['feature1', 'feature2'],
          projectId: 'project-123',
          sessionId: 'session-123',
        },
        headers: {
          'user-agent': 'test-agent',
        },
        url: '/api/agents/generate-plan',
        userId: 'user-123',
      };
      const mockReply = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
      const mockPlan = {
        id: 'plan-123',
        name: 'Test Project',
        description: 'Test Description',
      };

      mockRequest.userId = 'user-123';
      mockAgentsService.generateProjectPlan.mockResolvedValue(mockPlan);

      // Act
      agentsController(mockApp);
      const routeHandler = mockApp.post.mock.calls[0][2];
      await routeHandler(mockRequest, mockReply);

      // Assert
      expect(mockApp.post).toHaveBeenCalledWith(
        '/api/agents/generate-plan',
        expect.objectContaining({
          preHandler: [mockApp.authenticateToken],
        }),
        expect.any(Function)
      );
      expect(mockAgentsService.generateProjectPlan).toHaveBeenCalledWith(
        {
          name: 'Test Project',
          description: 'Test Description',
          type: 'web',
          features: ['feature1', 'feature2'],
        },
        {
          userId: 'user-123',
          projectId: 'project-123',
          sessionId: 'session-123',
          userAgent: 'test-agent',
          url: '/api/agents/generate-plan',
        }
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        ok: true,
        plan: mockPlan,
      });
    });

    it('should handle errors during plan generation', async () => {
      // Arrange
      const mockRequest = {
        body: {
          name: 'Test Project',
          description: 'Test Description',
          type: 'web',
          features: [],
        },
        headers: {},
        url: '/api/agents/generate-plan',
        userId: 'user-123',
      };
      const mockReply = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      mockRequest.userId = 'user-123';
      mockAgentsService.generateProjectPlan.mockRejectedValue(
        new Error('Service error')
      );

      // Act
      agentsController(mockApp);
      const routeHandler = mockApp.post.mock.calls[0][2];
      await routeHandler(mockRequest, mockReply);

      // Assert
      expect(mockApp.log.error).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: '프로젝트 계획 생성에 실패했습니다.',
      });
    });
  });

  describe('GET /api/agents/preview/:pageId/*', () => {
    it('should generate virtual preview successfully', async () => {
      // Arrange
      const mockRequest = {
        params: {
          pageId: 'page-123',
          '*': 'test.html',
        },
      };
      const mockReply = {
        type: jest.fn().mockReturnThis(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
      const mockHtml = '<html><body>Preview Content</body></html>';

      mockAgentsService.generateVirtualPreview.mockResolvedValue(mockHtml);

      // Act
      agentsController(mockApp);
      const routeHandler = mockApp.get.mock.calls[0][2];
      await routeHandler(mockRequest, mockReply);

      // Assert
      expect(mockApp.get).toHaveBeenCalledWith(
        '/api/agents/preview/:pageId/*',
        expect.objectContaining({
          preHandler: [mockApp.authenticateToken],
        }),
        expect.any(Function)
      );
      expect(mockAgentsService.generateVirtualPreview).toHaveBeenCalledWith(
        'page-123',
        '/test.html'
      );
      expect(mockReply.type).toHaveBeenCalledWith('text/html');
      expect(mockReply.send).toHaveBeenCalledWith(mockHtml);
    });

    it('should handle errors during preview generation', async () => {
      // Arrange
      const mockRequest = {
        params: {
          pageId: 'page-123',
          '*': 'test.html',
        },
      };
      const mockReply = {
        type: jest.fn().mockReturnThis(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      mockAgentsService.generateVirtualPreview.mockRejectedValue(
        new Error('Preview error')
      );

      // Act
      agentsController(mockApp);
      const routeHandler = mockApp.get.mock.calls[0][2];
      await routeHandler(mockRequest, mockReply);

      // Assert
      expect(mockApp.log.error).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: '가상 프리뷰 생성에 실패했습니다.',
      });
    });
  });

  describe('GET /api/agents/plan/:projectId', () => {
    it('should return project plan when found', async () => {
      // Arrange
      const mockRequest = {
        params: {
          projectId: 'project-123',
        },
      };
      const mockReply = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
      const mockPlan = {
        id: 'plan-123',
        name: 'Test Project',
        description: 'Test Description',
      };

      mockAgentsService.getProjectPlan.mockResolvedValue(mockPlan);

      // Act
      agentsController(mockApp);
      const routeHandler = mockApp.get.mock.calls[1][2];
      await routeHandler(mockRequest, mockReply);

      // Assert
      expect(mockApp.get).toHaveBeenCalledWith(
        '/api/agents/plan/:projectId',
        expect.objectContaining({
          preHandler: [mockApp.authenticateToken],
        }),
        expect.any(Function)
      );
      expect(mockAgentsService.getProjectPlan).toHaveBeenCalledWith('project-123');
      expect(mockReply.send).toHaveBeenCalledWith({
        ok: true,
        plan: mockPlan,
      });
    });

    it('should return 404 when project plan not found', async () => {
      // Arrange
      const mockRequest = {
        params: {
          projectId: 'project-123',
        },
      };
      const mockReply = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      mockAgentsService.getProjectPlan.mockResolvedValue(null);

      // Act
      agentsController(mockApp);
      const routeHandler = mockApp.get.mock.calls[1][2];
      await routeHandler(mockRequest, mockReply);

      // Assert
      expect(mockAgentsService.getProjectPlan).toHaveBeenCalledWith('project-123');
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: '프로젝트 계획을 찾을 수 없습니다.',
      });
    });

    it('should handle errors during plan retrieval', async () => {
      // Arrange
      const mockRequest = {
        params: {
          projectId: 'project-123',
        },
      };
      const mockReply = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      mockAgentsService.getProjectPlan.mockRejectedValue(
        new Error('Service error')
      );

      // Act
      agentsController(mockApp);
      const routeHandler = mockApp.get.mock.calls[1][2];
      await routeHandler(mockRequest, mockReply);

      // Assert
      expect(mockApp.log.error).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: '프로젝트 계획 조회에 실패했습니다.',
      });
    });
  });
});
