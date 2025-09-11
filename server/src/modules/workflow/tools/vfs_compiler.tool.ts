import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import { Tool, ExecutionContext } from '../types';
import { ProjectsService } from '@/modules/projects/projects.service';
import * as path from 'node:path';

// Minimal blueprint types and schema (decoupled from @navo/shared)
type BlueprintFileNode = { type: 'file'; name: string; content?: string };
type BlueprintFolderNode = {
  type: 'folder';
  name: string;
  children: BlueprintNode[];
};
type BlueprintNode = BlueprintFileNode | BlueprintFolderNode;

interface ProjectBlueprint {
  project: {
    file_structure: BlueprintFolderNode;
  };
}

const BlueprintNodeSchema: z.ZodType<BlueprintNode> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('file'),
      name: z.string(),
      content: z.string().optional(),
    }),
    z.object({
      type: z.literal('folder'),
      name: z.string(),
      children: z.array(BlueprintNodeSchema),
    }),
  ])
);

const ProjectBlueprintSchema = z.object({
  project: z.object({
    file_structure: z.object({
      type: z.literal('folder'),
      name: z.string(),
      children: z.array(BlueprintNodeSchema),
    }),
  }),
});

// Type definitions for the file structure nodes, inferred from the shared schema
type FileStructureNode = BlueprintNode;
type FolderNode = Extract<FileStructureNode, { type: 'folder' }>;
type FileNode = Extract<FileStructureNode, { type: 'file' }>;

// Helper to get the service from the execution context
function getProjectsService(context: ExecutionContext): ProjectsService {
  const app = context.app as FastifyInstance;
  return new ProjectsService(app);
}

/**
 * Recursively traverses the file structure from the blueprint and creates files/directories in the VFS.
 * @param projectsService The service to interact with the VFS.
 * @param projectId The ID of the project being modified.
 * @param userId The ID of the user performing the action.
 * @param currentNode The current node (file or folder) in the structure.
 * @param currentPath The parent path in the VFS for the current node.
 * @param createdPaths A list to accumulate the paths of created nodes.
 */
async function createVfsStructure(
  projectsService: ProjectsService,
  projectId: string,
  userId: string,
  currentNode: FileStructureNode,
  currentPath: string,
  createdPaths: string[]
): Promise<void> {
  const newPath = path.join(currentPath, currentNode.name).replace(/\\/g, '/');

  if (currentNode.type === 'folder') {
    // Ensure the directory exists. upsertVfsNodeByPath can handle this.
    // We pass empty string to signify an empty directory (service will create directory nodes appropriately).
    await projectsService.upsertVfsNodeByPath(projectId, userId, newPath, '');
    createdPaths.push(newPath);
    for (const child of (currentNode as any).children ?? []) {
      await createVfsStructure(
        projectsService,
        projectId,
        userId,
        child,
        newPath,
        createdPaths
      );
    }
  } else if (currentNode.type === 'file') {
    await projectsService.upsertVfsNodeByPath(
      projectId,
      userId,
      newPath,
      (currentNode as any).content || ''
    );
    createdPaths.push(newPath);
  }
}

// Define the input schema for our new tool, referencing the shared blueprint schema
const compileBlueprintToVfsInput = z.object({
  projectId: z
    .string()
    .describe('The ID of the project to write the files to.'),
  blueprint: ProjectBlueprintSchema.describe(
    'The project blueprint object, typically from the create_project_architecture tool.'
  ),
});

export const compileBlueprintToVfsTool: Tool = {
  name: 'compile_blueprint_to_vfs',
  description:
    'Compiles a project blueprint (IR) into a complete file and directory structure within the project VFS.',
  inputSchema: compileBlueprintToVfsInput,
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      projectId: { type: 'string' },
      nodesCreated: { type: 'number' },
      paths: { type: 'array', items: { type: 'string' } },
    },
  },
  async execute(
    context: ExecutionContext,
    input: z.infer<typeof compileBlueprintToVfsInput>
  ): Promise<any> {
    const { projectId, blueprint } = input;
    const { userId } = context;

    if (!userId) {
      throw new Error('User ID is missing from the execution context.');
    }

    const fileStructure = (blueprint as ProjectBlueprint).project
      .file_structure;
    if (!fileStructure || fileStructure.type !== 'folder') {
      throw new Error(
        'Invalid or missing file_structure in the input blueprint.'
      );
    }

    context.app.log.info(
      `[compile_blueprint_to_vfs] Compiling blueprint to VFS for project: ${projectId}`
    );

    try {
      const projectsService = getProjectsService(context);
      const createdPaths: string[] = [];

      const projectRootPath = '/';
      for (const child of fileStructure.children) {
        await createVfsStructure(
          projectsService,
          projectId,
          userId,
          child,
          projectRootPath,
          createdPaths
        );
      }

      context.app.log.info(
        `[compile_blueprint_to_vfs] Successfully created ${createdPaths.length} nodes in VFS.`
      );
      return {
        success: true,
        projectId: projectId,
        nodesCreated: createdPaths.length,
        paths: createdPaths,
      };
    } catch (error) {
      context.app.log.error(
        error as any,
        `[compile_blueprint_to_vfs] Failed to compile blueprint for project "${projectId}"`
      );
      throw error;
    }
  },
};
