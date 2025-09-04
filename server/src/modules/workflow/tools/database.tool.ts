/**
 * @file Defines tools for interacting with the database repositories.
 */

import { ExecutionContext, Tool } from '../types';
import { ProjectsRepositoryImpl } from '../../projects/projects.repository';
import { FastifyInstance } from 'fastify';

// This is a simplified way to get the repository. In a real app,
// this would likely come from a dependency injection container.
function getProjectsRepository(
  context: ExecutionContext
): ProjectsRepositoryImpl {
  const app = context.app as FastifyInstance;
  return new ProjectsRepositoryImpl(app);
}

export const createProjectInDbTool: Tool = {
  name: 'create_project_in_db',
  description:
    'Creates a new project record in the database, including a default home page.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the new project.',
      },
      description: {
        type: 'string',
        description: 'A brief description of the project.',
      },
      organizationId: {
        type: 'string',
        description: 'The ID of the organization this project belongs to.',
      },
      userId: {
        type: 'string',
        description: 'The ID of the user creating the project.',
      },
    },
    required: ['name', 'organizationId', 'userId'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: ['string', 'null'] },
      organizationId: { type: 'string' },
    },
  },
  async execute(
    context: ExecutionContext,
    input: {
      name: string;
      description?: string;
      organizationId: string;
      userId: string;
    }
  ): Promise<any> {
    console.log(`[create_project_in_db] Creating project '${input.name}'`);
    try {
      const projectsRepo = getProjectsRepository(context);
      const newProject = await projectsRepo.createProject(
        input.name,
        input.description ?? null,
        input.organizationId,
        input.userId
      );
      return newProject;
    } catch (error: any) {
      console.error(
        `[create_project_in_db] Failed to create project "${input.name}":`,
        error
      );
      throw error;
    }
  },
};

export const updateProjectFromArchitectureTool: Tool = {
  name: 'update_project_from_architecture',
  description:
    "Updates the database with the project's detailed architecture (pages, components) designed by the AI.",
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'The ID of the project to update.',
      },
      architecture: {
        type: 'object',
        description: 'The detailed project architecture JSON object.',
        properties: {
          pages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['path', 'name'],
            },
          },
          components: {
            type: 'object',
          },
        },
      },
    },
    required: ['projectId', 'architecture'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      projectId: { type: 'string' },
    },
  },
  async execute(
    context: ExecutionContext,
    input: {
      projectId: string;
      architecture: any; // In a real app, this would be a strongly typed ProjectArchitecture object
    }
  ): Promise<any> {
    console.log(
      `[update_project_from_architecture] Updating project '${input.projectId}'`
    );
    try {
      const projectsRepo = getProjectsRepository(context);
      await projectsRepo.updateProjectFromArchitecture(
        input.projectId,
        input.architecture
      );
      return { success: true, projectId: input.projectId };
    } catch (error: any) {
      console.error(
        `[update_project_from_architecture] Failed to update project "${input.projectId}":`,
        error
      );
      throw error;
    }
  },
};
