import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PagesService } from './pages.service';
import { PagesRepositoryImpl } from './pages.repository';
import { ProjectsRepositoryImpl } from '../projects/projects.repository';

jest.mock('./pages.repository');
jest.mock('../projects/projects.repository');

describe('PagesService', () => {
  let service: PagesService;
  let mockApp: any;
  let mockPagesRepo: any;
  let mockProjectsRepo: any;

  beforeEach(() => {
    mockApp = {
      log: {
        error: jest.fn(),
      },
    } as any;

    mockPagesRepo = {
      listPagesByProjectId: jest.fn(),
      getPageById: jest.fn(),
      getPageByPath: jest.fn(),
      createPage: jest.fn(),
      updatePage: jest.fn(),
      deletePage: jest.fn(),
    };

    mockProjectsRepo = {
      getProjectByUserId: jest.fn(),
    };

    jest.mocked(PagesRepositoryImpl).mockImplementation(() => mockPagesRepo);
    jest.mocked(ProjectsRepositoryImpl).mockImplementation(() => mockProjectsRepo);

    service = new PagesService(mockApp);
  });

  describe('listPages', () => {
    it('returns pages when project ownership verified', async () => {
      mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
      const pages = [{ id: 'page1', projectId: 'p1' }];
      mockPagesRepo.listPagesByProjectId.mockResolvedValue(pages);

      const result = await service.listPages('p1', 'u1');
      expect(result).toEqual(pages);
      expect(mockProjectsRepo.getProjectByUserId).toHaveBeenCalledWith('p1', 'u1');
      expect(mockPagesRepo.listPagesByProjectId).toHaveBeenCalledWith('p1');
    });

    it('throws when project not found or unauthorized', async () => {
      mockProjectsRepo.getProjectByUserId.mockResolvedValue(null);
      await expect(service.listPages('p1', 'u1')).rejects.toThrow('페이지 목록 조회에 실패했습니다.');
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('getPage', () => {
    it('returns page when exists and ownership verified', async () => {
      const page = { id: 'pg1', projectId: 'p1' } as any;
      mockPagesRepo.getPageById.mockResolvedValue(page);
      mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });

      const result = await service.getPage('pg1', 'u1');
      expect(result).toEqual(page);
    });

    it('throws when page not found', async () => {
      mockPagesRepo.getPageById.mockResolvedValue(null);
      await expect(service.getPage('pg1', 'u1')).rejects.toThrow('페이지 조회에 실패했습니다.');
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('getPageByPath', () => {
    it('returns page when exists and ownership verified', async () => {
      mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
      const page = { id: 'pg1', projectId: 'p1' } as any;
      mockPagesRepo.getPageByPath.mockResolvedValue(page);
      const result = await service.getPageByPath('p1', '/home', 'u1');
      expect(result).toEqual(page);
    });

    it('throws when page not found', async () => {
      mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
      mockPagesRepo.getPageByPath.mockResolvedValue(null);
      await expect(service.getPageByPath('p1', '/home', 'u1')).rejects.toThrow('경로별 페이지 조회에 실패했습니다.');
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('createPage', () => {
    it('creates page after ownership and uniqueness checks', async () => {
      mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
      mockPagesRepo.getPageByPath.mockResolvedValue(null);
      const created = { id: 'pg1', projectId: 'p1' } as any;
      mockPagesRepo.createPage.mockResolvedValue(created);

      const result = await service.createPage({ projectId: 'p1', path: '/p', title: 'T' } as any, 'u1');
      expect(result).toEqual(created);
    });

    it('throws when duplicate path exists', async () => {
      mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
      mockPagesRepo.getPageByPath.mockResolvedValue({ id: 'pg1' });
      await expect(
        service.createPage({ projectId: 'p1', path: '/p', title: 'T' } as any, 'u1')
      ).rejects.toThrow('페이지 생성에 실패했습니다.');
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('updatePage', () => {
    it('updates page after checks', async () => {
      const page = { id: 'pg1', projectId: 'p1' } as any;
      mockPagesRepo.getPageById.mockResolvedValue(page);
      mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
      const updated = { ...page, title: 'New' } as any;
      mockPagesRepo.updatePage.mockResolvedValue(updated);
      const result = await service.updatePage('pg1', { title: 'New' } as any, 'u1');
      expect(result).toEqual(updated);
    });

    it('throws when page missing', async () => {
      mockPagesRepo.getPageById.mockResolvedValue(null);
      await expect(service.updatePage('pg1', { title: 'New' } as any, 'u1')).rejects.toThrow('페이지 업데이트에 실패했습니다.');
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('deletePage', () => {
    it('deletes page after checks', async () => {
      const page = { id: 'pg1', projectId: 'p1' } as any;
      mockPagesRepo.getPageById.mockResolvedValue(page);
      mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
      await service.deletePage('pg1', 'u1');
      expect(mockPagesRepo.deletePage).toHaveBeenCalledWith('pg1');
    });

    it('throws when page missing', async () => {
      mockPagesRepo.getPageById.mockResolvedValue(null);
      await expect(service.deletePage('pg1', 'u1')).rejects.toThrow('페이지 삭제에 실패했습니다.');
      expect(mockApp.log.error).toHaveBeenCalled();
    });
  });

  describe('publish/unpublish', () => {
    it('publishes page', async () => {
      const page = { id: 'pg1', projectId: 'p1' } as any;
      mockPagesRepo.getPageById.mockResolvedValue(page);
      mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
      const updated = { ...page, isPublished: true } as any;
      mockPagesRepo.updatePage.mockResolvedValue(updated);
      const result = await service.publishPage('pg1', 'u1');
      expect(result).toEqual(updated);
    });

    it('unpublishes page', async () => {
      const page = { id: 'pg1', projectId: 'p1' } as any;
      mockPagesRepo.getPageById.mockResolvedValue(page);
      mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
      const updated = { ...page, isPublished: false } as any;
      mockPagesRepo.updatePage.mockResolvedValue(updated);
      const result = await service.unpublishPage('pg1', 'u1');
      expect(result).toEqual(updated);
    });
  });
});

