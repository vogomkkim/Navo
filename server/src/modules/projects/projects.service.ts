import { FastifyInstance } from 'fastify';

import type { Project, VfsNode, ProjectArchitecture } from '@/modules/projects/projects.types';
import { ProjectsRepositoryImpl } from './projects.repository';
import { VfsRepositoryImpl } from './vfs.repository';

export class ProjectsService {
  private projectsRepository: ProjectsRepositoryImpl;
  private vfsRepository: VfsRepositoryImpl;

  constructor(private readonly app: FastifyInstance) {
    this.projectsRepository = new ProjectsRepositoryImpl(app);
    this.vfsRepository = new VfsRepositoryImpl(app);
  }

  async listProjects(userId: string): Promise<Project[]> {
    return this.projectsRepository.listProjectsByUserId(userId);
  }

  async listProjectVfsNodes(
    projectId: string,
    parentId: string | null,
    userId: string,
  ): Promise<VfsNode[]> {
    const project = await this.projectsRepository.getProjectByUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.listNodesByParentId(projectId, parentId);
  }

  async getVfsNode(
    nodeId: string,
    projectId: string,
    userId: string,
  ): Promise<VfsNode | null> {
    const project = await this.projectsRepository.getProjectByUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.getNodeById(nodeId, projectId);
  }

  async updateVfsNodeContent(
    nodeId: string,
    projectId: string,
    userId: string,
    content: string,
  ): Promise<VfsNode | null> {
    const project = await this.projectsRepository.getProjectByUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    const node = await this.vfsRepository.getNodeById(nodeId, projectId);
    if (!node) {
      throw new Error('File does not exist in this project.');
    }
    if (node.nodeType !== 'FILE') {
      throw new Error('Cannot update content of a directory.');
    }
    return this.vfsRepository.updateNodeContent(nodeId, content);
  }
  
  // This method now clearly belongs in the ProjectsService as it orchestrates both repos
  async updateProjectFromArchitecture(
    projectId: string,
    architecture: ProjectArchitecture,
    userId: string,
  ): Promise<void> {
    const project = await this.projectsRepository.getProjectByUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.syncArchitecture(projectId, architecture);
  }

  // ... (other project-specific methods like rename, delete, etc.)
}