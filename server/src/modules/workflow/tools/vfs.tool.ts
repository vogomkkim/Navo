import { ExecutionContext, Tool } from '../types';
import { ProjectsService } from '../../projects/projects.service';

// VFS에 파일을 생성하는 도구
export const createVfsFileTool: Tool = {
  name: 'create_vfs_file',
  description: 'Creates a file in the VFS (Virtual File System) with the specified content.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file in VFS (e.g., /pages/Home.tsx)'
      },
      content: {
        type: 'string',
        description: 'The content to write to the file.',
      },
    },
    required: ['path', 'content'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      path: { type: 'string' },
      nodeId: { type: 'string' },
    },
  },
  async execute(
    context: ExecutionContext,
    input: { path: string; content: string }
  ): Promise<{ success: boolean; path: string; nodeId: string }> {
    console.log(`[create_vfs_file] Creating VFS file: ${input.path}`);

    try {
      const projectsService = new ProjectsService(context.app);
      const { projectId, userId } = context;

      if (!projectId || !userId) {
        throw new Error('Project ID and User ID are required');
      }

      // VFS에 파일 생성 또는 업데이트
      const vfsNode = await projectsService.upsertVfsNodeByPath(
        projectId,
        userId,
        input.path,
        input.content
      );

      if (!vfsNode) {
        throw new Error(`Failed to create VFS file at ${input.path}`);
      }

      console.log(`[create_vfs_file] Successfully created VFS file: ${input.path} (ID: ${vfsNode.id})`);

      return {
        success: true,
        path: input.path,
        nodeId: vfsNode.id
      };
    } catch (error: any) {
      console.error(
        `[create_vfs_file] Failed to create VFS file "${input.path}":`,
        error
      );
      throw error;
    }
  },
};

// VFS에 디렉토리를 생성하는 도구
export const createVfsDirectoryTool: Tool = {
  name: 'create_vfs_directory',
  description: 'Creates a directory in the VFS (Virtual File System).',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the directory in VFS (e.g., /pages)'
      },
    },
    required: ['path'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      path: { type: 'string' },
      nodeId: { type: 'string' },
    },
  },
  async execute(
    context: ExecutionContext,
    input: { path: string }
  ): Promise<{ success: boolean; path: string; nodeId: string }> {
    console.log(`[create_vfs_directory] Creating VFS directory: ${input.path}`);

    try {
      const projectsService = new ProjectsService(context.app);
      const { projectId, userId } = context;

      if (!projectId || !userId) {
        throw new Error('Project ID and User ID are required');
      }

      // VFS에 디렉토리 생성
      const vfsNode = await projectsService.findOrCreateVfsNodeByPath(
        projectId,
        userId,
        input.path
      );

      if (!vfsNode) {
        throw new Error(`Failed to create VFS directory at ${input.path}`);
      }

      console.log(`[create_vfs_directory] Successfully created VFS directory: ${input.path} (ID: ${vfsNode.id})`);

      return {
        success: true,
        path: input.path,
        nodeId: vfsNode.id
      };
    } catch (error: any) {
      console.error(
        `[create_vfs_directory] Failed to create VFS directory "${input.path}":`,
        error
      );
      throw error;
    }
  },
};
