import { AgentsService } from './agents.service';
import { AgentsRepository } from './agents.repository';
import { MasterDeveloperAgent } from './masterDeveloperAgent';
import { VirtualPreviewGeneratorAgent } from './virtualPreviewGeneratorAgent';

// Mock dependencies
jest.mock('./agents.repository.js');
jest.mock('./masterDeveloperAgent.js');
jest.mock('./virtualPreviewGeneratorAgent.js');

describe('AgentsService', () => {
  let agentsService: AgentsService;
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
      saveProjectPlan: jest.fn(),
      getProjectPlan: jest.fn(),
      saveVirtualPreview: jest.fn(),
      getVirtualPreview: jest.fn(),
    };

    (AgentsRepository as jest.MockedClass<typeof AgentsRepository>).mockImplementation(() => mockRepository);

    agentsService = new AgentsService(mockApp);
  });

  describe('generateProjectPlan', () => {
    it('should generate and save project plan successfully', async () => {
      // Arrange
      const request = {
        name: 'Test Project',
        description: 'Test Description',
        type: 'web' as const,
        features: ['feature1', 'feature2'],
      };
      const context = {
        userId: 'user-123',
        projectId: 'project-123',
        sessionId: 'session-123',
      };
      const mockPlan = {
        id: 'plan-123',
        name: 'Test Project',
        description: 'Test Description',
        // ... other plan properties
      };

      (MasterDeveloperAgent.prototype.createProject as jest.Mock).mockResolvedValue(mockPlan);
      mockRepository.saveProjectPlan.mockResolvedValue('saved-plan-id');

      // Act
      const result = await agentsService.generateProjectPlan(request, context);

      // Assert
      expect(result).toEqual(mockPlan);
      expect(MasterDeveloperAgent.prototype.createProject).toHaveBeenCalledWith(request, context);
      expect(mockRepository.saveProjectPlan).toHaveBeenCalledWith({
        projectId: 'project-123',
        userId: 'user-123',
        planData: mockPlan,
        context: context,
      });
    });

    it('should generate plan without saving when projectId or userId is missing', async () => {
      // Arrange
      const request = {
        name: 'Test Project',
        description: 'Test Description',
        type: 'web' as const,
        features: [],
      };
      const context = {
        sessionId: 'session-123',
        // Missing userId and projectId
      };
      const mockPlan = {
        id: 'plan-123',
        name: 'Test Project',
        description: 'Test Description',
      };

      (MasterDeveloperAgent.prototype.createProject as jest.Mock).mockResolvedValue(mockPlan);

      // Act
      const result = await agentsService.generateProjectPlan(request, context);

      // Assert
      expect(result).toEqual(mockPlan);
      expect(MasterDeveloperAgent.prototype.createProject).toHaveBeenCalledWith(request, context);
      expect(mockRepository.saveProjectPlan).not.toHaveBeenCalled();
    });

    it('should handle errors during plan generation', async () => {
      // Arrange
      const request = {
        name: 'Test Project',
        description: 'Test Description',
        type: 'web' as const,
        features: [],
      };
      const context = {};

      (MasterDeveloperAgent.prototype.createProject as jest.Mock).mockRejectedValue(
        new Error('Agent error')
      );

      // Act & Assert
      await expect(agentsService.generateProjectPlan(request, context)).rejects.toThrow(
        '프로젝트 계획 생성에 실패했습니다.'
      );
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('generateVirtualPreview', () => {
    it('should return existing preview if available', async () => {
      // Arrange
      const pageId = 'page-123';
      const filePath = '/test.html';
      const existingHtml = '<html><body>Existing Preview</body></html>';

      mockRepository.getVirtualPreview.mockResolvedValue(existingHtml);

      // Act
      const result = await agentsService.generateVirtualPreview(pageId, filePath);

      // Assert
      expect(result).toEqual(existingHtml);
      expect(mockRepository.getVirtualPreview).toHaveBeenCalledWith(pageId, filePath);
      expect(mockRepository.saveVirtualPreview).not.toHaveBeenCalled();
    });

    it('should generate and save new preview when not available', async () => {
      // Arrange
      const pageId = 'page-123';
      const filePath = '/test.html';
      const newHtml = '<html><body>New Preview</body></html>';

      mockRepository.getVirtualPreview.mockResolvedValue(null);
      (VirtualPreviewGeneratorAgent.prototype.execute as jest.Mock).mockResolvedValue(newHtml);
      mockRepository.saveVirtualPreview.mockResolvedValue('preview-id');

      // Act
      const result = await agentsService.generateVirtualPreview(pageId, filePath);

      // Assert
      expect(result).toEqual(newHtml);
      expect(mockRepository.getVirtualPreview).toHaveBeenCalledWith(pageId, filePath);
      expect(VirtualPreviewGeneratorAgent.prototype.execute).toHaveBeenCalledWith({
        pageId,
        filePath,
      });
      expect(mockRepository.saveVirtualPreview).toHaveBeenCalledWith({
        pageId,
        htmlContent: newHtml,
        filePath,
      });
    });

    it('should handle errors during preview generation', async () => {
      // Arrange
      const pageId = 'page-123';
      const filePath = '/test.html';

      mockRepository.getVirtualPreview.mockResolvedValue(null);
      (VirtualPreviewGeneratorAgent.prototype.execute as jest.Mock).mockRejectedValue(
        new Error('Preview generation error')
      );

      // Act & Assert
      await expect(agentsService.generateVirtualPreview(pageId, filePath)).rejects.toThrow(
        '가상 프리뷰 생성에 실패했습니다.'
      );
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('getProjectPlan', () => {
    it('should return project plan when available', async () => {
      // Arrange
      const projectId = 'project-123';
      const mockPlanData = {
        id: 'plan-123',
        projectId: 'project-123',
        userId: 'user-123',
        planData: {
          name: 'Test Project',
          description: 'Test Description',
        },
        context: {},
        status: 'active',
      };

      mockRepository.getProjectPlan.mockResolvedValue(mockPlanData);

      // Act
      const result = await agentsService.getProjectPlan(projectId);

      // Assert
      expect(result).toEqual(mockPlanData.planData);
      expect(mockRepository.getProjectPlan).toHaveBeenCalledWith(projectId);
    });

    it('should return null when project plan not found', async () => {
      // Arrange
      const projectId = 'project-123';

      mockRepository.getProjectPlan.mockResolvedValue(null);

      // Act
      const result = await agentsService.getProjectPlan(projectId);

      // Assert
      expect(result).toBeNull();
      expect(mockRepository.getProjectPlan).toHaveBeenCalledWith(projectId);
    });

    it('should handle errors during plan retrieval', async () => {
      // Arrange
      const projectId = 'project-123';

      mockRepository.getProjectPlan.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(agentsService.getProjectPlan(projectId)).rejects.toThrow(
        '프로젝트 계획 조회에 실패했습니다.'
      );
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });
});
