/**
 * @file Defines the scaffold_project_from_blueprint tool.
 * This tool takes a project blueprint (specifically the file_structure part)
 * and creates the corresponding files and directories in the VFS.
 */
import { ProjectsService } from '@/modules/projects/projects.service';
import { ExecutionContext, Tool } from '../types';
import { z } from 'zod';

// Define the structure of a node in the blueprint's file_structure
const fileStructureNodeSchema = z.lazy(() =>
  z.object({
    type: z.enum(['file', 'folder']),
    name: z.string(),
    content: z.string().optional().nullable(),
    children: z.array(fileStructureNodeSchema).optional().nullable(),
  }),
);

// Define the input schema for the tool using Zod
const inputSchema = z.object({
  projectId: z.string().describe('The ID of the project in which to scaffold the structure.'),
  userId: z.string().describe('The ID of the user performing the action.'),
  file_structure: fileStructureNodeSchema.describe('The hierarchical file structure to create.'),
});

type Input = z.infer<typeof inputSchema>;

// Recursive function to walk the blueprint and create VFS nodes
async function scaffoldNode(
  service: ProjectsService,
  node: z.infer<typeof fileStructureNodeSchema>,
  parentId: string | null,
  projectId: string,
  userId: string,
): Promise<void> {
  const newNode = await service.createVfsNode(projectId, userId, {
    parentId,
    nodeType: node.type === 'folder' ? 'DIRECTORY' : 'FILE',
    name: node.name,
    content: node.content,
  });

  if (node.type === 'folder' && node.children) {
    for (const child of node.children) {
      // Recursively call for children, passing the new node's ID as the parentId
      await scaffoldNode(service, child, newNode.id, projectId, userId);
    }
  }
}

export const scaffoldProjectTool: Tool = {
  name: 'scaffold_project_from_blueprint',
  description: 'Scaffolds a project\'s file and directory structure in the VFS from a blueprint.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The ID of the project.' },
      userId: { type: 'string', description: 'The ID of the user.' },
      file_structure: {
        type: 'object',
        description: 'The hierarchical file structure from the blueprint.',
      },
    },
    required: ['projectId', 'userId', 'file_structure'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
    },
  },
  async execute(context: ExecutionContext, input: Input): Promise<any> {
    const { projectId, userId, file_structure } = inputSchema.parse(input);
    const projectsService = new ProjectsService(context.app);

    context.app.log.info(`[ScaffolderTool] Starting scaffolding for project ID: ${projectId}`);

    try {
      // Start the recursive scaffolding process from the root (parentId = null)
      await scaffoldNode(projectsService, file_structure, null, projectId, userId);
      
      context.app.log.info(`[ScaffolderTool] Successfully scaffolded project ID: ${projectId}`);
      return {
        success: true,
        message: 'Project structure scaffolded successfully.',
      };
    } catch (error: any) {
      context.app.log.error(error, `[ScaffolderTool] Error scaffolding project ID: ${projectId}`);
      throw new Error(`Failed to scaffold project: ${error.message}`);
    }
  },
};
