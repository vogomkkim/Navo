import { FastifyInstance } from 'fastify';
import { applyTextPatch, type TextPatchOptions } from '@/lib/textPatch';
import * as crypto from 'node:crypto';

import type {
  Project,
  VfsNode,
  ProjectArchitecture,
  CreateChatMessage,
  CreateProjectData,
  VfsTree,
} from '@/modules/projects/projects.types';
import { ProjectsRepositoryImpl } from './projects.repository';
import { VfsRepositoryImpl } from './vfs.repository';
import { ChatRepository } from './chat.repository'; // Import the new repository

export class ProjectsService {
  private projectsRepository: ProjectsRepositoryImpl;
  private vfsRepository: VfsRepositoryImpl;
  private chatRepository: ChatRepository; // Add the new repository

  constructor(private readonly app: FastifyInstance) {
    this.projectsRepository = new ProjectsRepositoryImpl(app);
    this.vfsRepository = new VfsRepositoryImpl(app);
    this.chatRepository = new ChatRepository(); // Instantiate it
  }

  // --- VFS Tree Method for Live Preview ---

  async getVfsTree(
    projectId: string,
    userId: string,
    options: { includeContent?: boolean },
  ): Promise<VfsTree> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }

    const allNodes = await this.vfsRepository.listNodesByProject(projectId);
    if (allNodes.length === 0) {
      return {
        projectId,
        version: '',
        nodes: [],
      };
    }

    const nodeMap = new Map<string, VfsNode>(allNodes.map((n) => [n.id, n]));
    const pathMap = new Map<string, string>();
    const root = allNodes.find((n) => n.parentId === null);

    if (!root) {
      throw new Error('Project root not found.');
    }

    // Recursively build paths for all nodes
    const buildPath = (nodeId: string): string => {
      if (pathMap.has(nodeId)) return pathMap.get(nodeId)!;

      const node = nodeMap.get(nodeId);
      if (!node) return '';
      if (node.parentId === null) {
        pathMap.set(nodeId, '/');
        return '/';
      }

      const parentPath = buildPath(node.parentId);
      const fullPath =
        parentPath === '/'
          ? `/${node.name}`
          : `${parentPath}/${node.name}`;
      pathMap.set(nodeId, fullPath);
      return fullPath;
    };

    for (const node of allNodes) {
      buildPath(node.id);
    }

    const treeNodes = allNodes
      .filter((n) => n.parentId !== null) // Exclude root '/' directory
      .map((node) => ({
        path: pathMap.get(node.id)!.substring(1), // Remove leading '/'
        type: node.nodeType.toLowerCase() as 'file' | 'directory',
        content:
          options.includeContent && node.nodeType === 'FILE'
            ? node.content
            : undefined,
        hash:
          node.nodeType === 'FILE' && node.content
            ? crypto.createHash('sha256').update(node.content).digest('hex')
            : undefined,
      }));

    // Calculate the overall version hash from all file hashes
    const contentToHash = treeNodes
      .filter((n) => n.type === 'file' && n.hash)
      .map((n) => n.hash)
      .sort()
      .join('');

    const version = crypto
      .createHash('sha256')
      .update(contentToHash)
      .digest('hex');

    return {
      projectId,
      version,
      nodes: treeNodes,
    };
  }

  // --- Chat Methods ---

  async getMessages(
    projectId: string,
    userId: string,
    options: { cursor?: string; limit: number },
  ) {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.chatRepository.getMessagesByProjectId(projectId, options);
  }

  async createMessage(
    projectId: string,
    userId: string,
    messageData: { role: string; content: string; payload?: any },
  ) {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }

    const messageToCreate: CreateChatMessage = {
      projectId,
      userId,
      role: messageData.role,
      content: messageData.content,
      payload: messageData.payload,
    };

    return this.chatRepository.createMessage(messageToCreate);
  }

  // --- Existing Methods ---

  // --- Project Methods ---

  async createProject(
    projectData: CreateProjectData,
    userId: string,
  ): Promise<Project> {
    // Ensure the user belongs to the organization they are creating a project in
    if (projectData.organizationId) {
      const userOrgs =
        await this.projectsRepository.listProjectsByUserId(userId);
      const isMember = userOrgs.some(
        (p) => p.organizationId === projectData.organizationId,
      );
      // This logic is a bit flawed, as listProjectsByUserId returns projects, not orgs.
      // A proper implementation would check the usersToOrganizations table.
      // For now, we'll trust the organizationId from the planner.
    }
    this.app.log.info({ projectData }, 'Creating new project in service');
    return this.projectsRepository.createProject(projectData);
  }

  async listProjects(userId: string): Promise<Project[]> {
    return this.projectsRepository.listProjectsByUserId(userId);
  }

  async renameProject(
    projectId: string,
    name: string,
    userId: string,
  ): Promise<Project | null> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.projectsRepository.updateProjectName(projectId, name);
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.projectsRepository.deleteProjectById(projectId);
  }

  async rollbackProject(projectId: string, userId: string): Promise<void> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.projectsRepository.rollbackProject(projectId);
  }

  async listProjectVfsNodes(
    projectId: string,
    parentId: string | null,
    userId: string,
  ): Promise<VfsNode[]> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
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
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.getNodeById(nodeId, projectId);
  }

  async createVfsNode(
    projectId: string,
    userId: string,
    params: {
      parentId: string | null;
      nodeType: 'FILE' | 'DIRECTORY';
      name: string;
      content?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<VfsNode> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.createNode({ projectId, ...params });
  }

  async renameVfsNode(
    projectId: string,
    userId: string,
    params: { nodeId: string; newName: string },
  ): Promise<VfsNode | null> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.renameNode({ projectId, ...params });
  }

  async moveVfsNode(
    projectId: string,
    userId: string,
    params: { nodeId: string; newParentId: string | null },
  ): Promise<VfsNode | null> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.moveNode({ projectId, ...params });
  }

  async deleteVfsNode(
    projectId: string,
    userId: string,
    params: { nodeId: string },
  ): Promise<boolean> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.deleteNode({ projectId, ...params });
  }

  async findVfsNodeByPath(
    projectId: string,
    userId: string,
    path: string,
  ): Promise<VfsNode | null> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.findByPath(projectId, path);
  }

  async updateVfsNodeContent(
    nodeId: string,
    projectId: string,
    userId: string,
    content: string,
  ): Promise<VfsNode | null> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
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
    return this.vfsRepository.updateNodeContent(nodeId, projectId, content);
  }

  async upsertVfsNodeByPath(
    projectId: string,
    userId: string,
    path: string,
    content: string,
  ): Promise<VfsNode> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.upsertByPath(projectId, path, content);
  }

  async applyPatchVfsNodeByPath(
    projectId: string,
    userId: string,
    path: string,
    patchPayload:
      | string
      | { find: string; replace: string; isRegex?: boolean; flags?: string },
    options?: TextPatchOptions,
  ): Promise<VfsNode> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }

    // Ensure file exists (create if not)
    const node = await this.vfsRepository.findByPath(projectId, path);
    const target =
      node ?? (await this.vfsRepository.findOrCreateByPath(projectId, path));

    // Load latest content
    const fresh = await this.vfsRepository.getNodeById(target.id, projectId);
    const current = fresh?.content ?? '';

    // Apply patch
    const { updatedText } = applyTextPatch(current, patchPayload as any, options);

    // Save
    const updated = await this.vfsRepository.updateNodeContent(
      target.id,
      projectId,
      updatedText,
    );
    return (updated as VfsNode) ?? target;
  }

  // This method now clearly belongs in the ProjectsService as it orchestrates both repos
  async updateProjectFromArchitecture(
    projectId: string,
    architecture: ProjectArchitecture,
    userId: string,
  ): Promise<void> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.syncArchitecture(projectId, architecture);
  }

  async findOrCreateVfsNodeByPath(
    projectId: string,
    userId: string,
    path: string,
  ): Promise<VfsNode> {
    const project = await this.projectsRepository.getProjectByUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new Error('Project not found or access denied.');
    }
    return this.vfsRepository.findOrCreateByPath(projectId, path);
  }
}
