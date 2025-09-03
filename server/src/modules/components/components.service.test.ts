import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ComponentsService } from './components.service';
import { ComponentsRepositoryImpl } from './components.repository';
import { ProjectsRepositoryImpl } from '../projects/projects.repository';

jest.mock('./components.repository');
jest.mock('../projects/projects.repository');

describe('ComponentsService', () => {
  let service: ComponentsService;
  let mockApp: any;
  let mockRepo: any;
  let mockProjectsRepo: any;

  beforeEach(() => {
    mockApp = { log: { error: jest.fn() } } as any;
    mockRepo = {
      listComponentDefinitions: jest.fn(),
      getComponentDefinitionById: jest.fn(),
      getComponentDefinitionByName: jest.fn(),
      createComponentDefinition: jest.fn(),
      updateComponentDefinition: jest.fn(),
      deleteComponentDefinition: jest.fn(),
      seedComponentDefinitions: jest.fn(),
    };
    mockProjectsRepo = { getProjectByUserId: jest.fn() };
    jest.mocked(ComponentsRepositoryImpl).mockImplementation(() => mockRepo);
    jest
      .mocked(ProjectsRepositoryImpl)
      .mockImplementation(() => mockProjectsRepo);
    service = new ComponentsService(mockApp);
  });

  it('lists component definitions with ownership check', async () => {
    mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
    const defs = [{ id: 'c1', projectId: 'p1' }];
    mockRepo.listComponentDefinitions.mockResolvedValue(defs);
    const result = await service.listComponentDefinitions('p1', 'u1');
    expect(result).toEqual(defs);
  });

  it('gets component definition by id with ownership check', async () => {
    const def = { id: 'c1', projectId: 'p1' } as any;
    mockRepo.getComponentDefinitionById.mockResolvedValue(def);
    mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
    const result = await service.getComponentDefinition('c1', 'u1');
    expect(result).toEqual(def);
  });

  it('creates component definition after checks', async () => {
    mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
    mockRepo.getComponentDefinitionByName.mockResolvedValue(null);
    const created = { id: 'c1', projectId: 'p1' } as any;
    mockRepo.createComponentDefinition.mockResolvedValue(created);
    const result = await service.createComponentDefinition(
      { name: 'n', projectId: 'p1' } as any,
      'u1'
    );
    expect(result).toEqual(created);
  });

  it('updates component definition after checks', async () => {
    const def = { id: 'c1', projectId: 'p1' } as any;
    mockRepo.getComponentDefinitionById.mockResolvedValue(def);
    mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
    const updated = { ...def, description: 'd' } as any;
    mockRepo.updateComponentDefinition.mockResolvedValue(updated);
    const result = await service.updateComponentDefinition(
      'c1',
      { description: 'd' } as any,
      'u1'
    );
    expect(result).toEqual(updated);
  });

  it('deletes component definition after checks', async () => {
    const def = { id: 'c1', projectId: 'p1' } as any;
    mockRepo.getComponentDefinitionById.mockResolvedValue(def);
    mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
    await service.deleteComponentDefinition('c1', 'u1');
    expect(mockRepo.deleteComponentDefinition).toHaveBeenCalledWith('c1');
  });

  it('seeds component definitions after ownership check', async () => {
    mockProjectsRepo.getProjectByUserId.mockResolvedValue({ id: 'p1' });
    const seeded = [{ id: 'c1', projectId: 'p1' } as any];
    mockRepo.seedComponentDefinitions.mockResolvedValue(seeded as any);
    const result = await service.seedComponentDefinitions('p1', [], 'u1');
    expect(result).toEqual(seeded as any);
  });
});
