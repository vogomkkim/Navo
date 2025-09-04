/**
 * @file Defines the generate_project_files tool.
 * This tool takes a project architecture plan and creates the actual file and directory structure.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { ExecutionContext, Tool } from '../types';

// Type definition for the file structure node, based on the architect's output.
type FileNode = {
  type: 'file';
  name: string;
  content: string;
};

type FolderNode = {
  type: 'folder';
  name: string;
  children: (FileNode | FolderNode)[];
};

type ProjectStructure = FolderNode;

/**
 * Recursively traverses the file structure and creates files and directories.
 * @param currentNode The current node (file or folder) in the structure.
 * @param currentPath The path on the filesystem to create the node in.
 * @param createdFiles A list to accumulate the paths of created files.
 */
async function createStructure(
  currentNode: FileNode | FolderNode,
  currentPath: string,
  createdFiles: string[],
): Promise<void> {
  const newPath = path.join(currentPath, currentNode.name);

  if (currentNode.type === 'folder') {
    await fs.mkdir(newPath, { recursive: true });
    for (const child of currentNode.children) {
      await createStructure(child, newPath, createdFiles);
    }
  } else if (currentNode.type === 'file') {
    await fs.writeFile(newPath, currentNode.content || '', 'utf-8');
    createdFiles.push(newPath);
  }
}

export const generateProjectFilesTool: Tool = {
  name: 'generate_project_files',
  description:
    'Generates a project directory and file structure based on a provided architecture plan.',
  inputSchema: {
    type: 'object',
    properties: {
      architecture: {
        type: 'object',
        description:
          'The project architecture object, typically from the create_project_architecture tool.',
        properties: {
          project: {
            type: 'object',
            properties: {
              file_structure: { type: 'object' },
            },
            required: ['file_structure'],
          },
        },
        required: ['project'],
      },
      basePath: {
        type: 'string',
        description:
          'The base directory where the project will be created. Defaults to a temporary directory.',
      },
    },
    required: ['architecture'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      projectPath: { type: 'string' },
      filesCreated: { type: 'array', items: { type: 'string' } },
    },
  },
  async execute(
    context: ExecutionContext,
    input: { architecture: any; basePath?: string },
  ): Promise<any> {
    const fileStructure = input.architecture?.file_structure;
    if (!fileStructure || fileStructure.type !== 'folder') {
      throw new Error(
        'Invalid or missing file_structure in the input architecture.',
      );
    }

    const projectRoot = path.resolve(input.basePath || '.');
    console.log(
      `[generate_project_files] Creating project structure in: ${projectRoot}`,
    );

    try {
      const createdFiles: string[] = [];
      // The root of the file_structure is the project folder itself.
      await createStructure(fileStructure, projectRoot, createdFiles);

      const finalProjectPath = path.join(projectRoot, fileStructure.name);

      console.log(
        `[generate_project_files] Successfully created ${createdFiles.length} files.`,
      );
      return {
        success: true,
        projectPath: finalProjectPath,
        filesCreated: createdFiles,
      };
    } catch (error: any) {
      console.error(
        `[generate_project_files] Failed to create project structure:`,
        error,
      );
      throw error;
    }
  },
};
