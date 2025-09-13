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
 * Generates sensible default file contents when blueprint nodes omitted `content`.
 * Heuristics are based on filename and extension (Next.js/React biased).
 */
function generateDefaultContentForPath(absoluteVfsPath: string): string {
  const filename = path.basename(absoluteVfsPath);
  const ext = path.extname(filename).toLowerCase();

  // Next.js conventions
  if (filename === 'page.tsx' || filename === 'page.jsx') {
    return `export default function Page() {\n  return (\n    <main style={{ padding: 16 }}>\n      <h1>${path.dirname(absoluteVfsPath).split('/').pop() || 'Page'}</h1>\n    </main>\n  );\n}\n`;
  }
  if (filename === 'layout.tsx' || filename === 'layout.jsx') {
    return `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>{children}</body>\n    </html>\n  );\n}\n`;
  }

  // React components
  if (ext === '.tsx' || ext === '.jsx') {
    const base = filename.replace(/\.(tsx|jsx)$/i, '');
    const componentName = base
      .split(/[^a-zA-Z0-9]/)
      .filter(Boolean)
      .map((s) => s[0]?.toUpperCase() + s.slice(1))
      .join('') || 'Component';
    return `export default function ${componentName}() {\n  return <div>${componentName}</div>;\n}\n`;
  }

  // TypeScript/JavaScript modules
  if (ext === '.ts' || ext === '.js') {
    return `export function handler() {\n  return null;\n}\n`;
  }

  // JSON
  if (ext === '.json') {
    return `{}\n`;
  }

  // Markdown
  if (ext === '.md' || ext === '.mdx') {
    const title = path.basename(filename, ext);
    return `# ${title}\n`;
  }

  // CSS
  if (ext === '.css') {
    return `/* ${filename} */\n`;
  }

  // Default empty
  return '';
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
    // Do not upsert a file for folders; rely on file upserts below to create intermediate directories.
    // If this folder is empty, it will be implicitly absent in VFS, which is acceptable for most toolchains.
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
    const provided = (currentNode as any).content;
    const content = provided !== undefined ? provided : generateDefaultContentForPath(newPath);
    await projectsService.upsertVfsNodeByPath(projectId, userId, newPath, content);
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
