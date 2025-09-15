import { ExecutionContext, Tool } from '../types';
import { ProjectsService } from '../../projects/projects.service';

// VFS에 파일을 생성하는 도구
export const createVfsFileTool: Tool = {
  name: 'create_vfs_file',
  description: 'Creates or finds a file in the VFS. If content is provided, it updates the file.',
  // ... (schema remains the same)
  async execute(
    context: ExecutionContext,
    input: { path: string; content?: string }
  ): Promise<{ success: boolean; path: string; nodeId: string }> {
    const { projectId, userId } = context;
    if (!projectId || !userId) {
      throw new Error('Project ID and User ID are required');
    }
    
    const projectsService = new ProjectsService(context.app);
    console.log(`[create_vfs_file] Ensuring file exists at: ${input.path}`);
    
    try {
      const node = await projectsService.findOrCreateVfsNodeByPath(projectId, userId, input.path);

      if (typeof input.content === 'string') {
        console.log(`[create_vfs_file] Updating content for: ${input.path}`);
        await projectsService.updateVfsNodeContent(node.id, projectId, userId, input.content);
      }

      console.log(`[create_vfs_file] Successfully processed file: ${input.path} (ID: ${node.id})`);
      return { success: true, path: input.path, nodeId: node.id };
    } catch (error: any) {
      console.error(`[create_vfs_file] Failed to process file "${input.path}":`, error);
      throw error;
    }
  },
};

// VFS에 디렉토리를 생성하는 도구
export const createVfsDirectoryTool: Tool = {
  name: 'create_vfs_directory',
  description: 'Creates or finds a directory in the VFS.',
  // ... (schema remains the same)
  async execute(
    context: ExecutionContext,
    input: { path: string }
  ): Promise<{ success: boolean; path: string; nodeId: string }> {
    const { projectId, userId } = context;
    if (!projectId || !userId) {
      throw new Error('Project ID and User ID are required');
    }

    const projectsService = new ProjectsService(context.app);
    const dirPath = input.path.endsWith('/') ? input.path : `${input.path}/`;
    console.log(`[create_vfs_directory] Ensuring directory exists at: ${dirPath}`);

    try {
      const node = await projectsService.findOrCreateVfsNodeByPath(projectId, userId, dirPath);
      console.log(`[create_vfs_directory] Successfully processed directory: ${dirPath} (ID: ${node.id})`);
      return { success: true, path: input.path, nodeId: node.id };
    } catch (error: any) {
      console.error(`[create_vfs_directory] Failed to process directory "${input.path}":`, error);
      throw error;
    }
  },
};
