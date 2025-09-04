/**
 * @file Defines tools for interacting with the database via services.
 */

import { ExecutionContext, Tool } from '../types';
import { ProjectsService } from '../../projects/projects.service';
import { FastifyInstance } from 'fastify';

// Helper to get the service from the execution context
function getProjectsService(
  context: ExecutionContext
): ProjectsService {
  const app = context.app as FastifyInstance;
  // In a real DI setup, we'd resolve this from a container
  return new ProjectsService(app);
}

export const createProjectInDbTool: Tool = {
  name: 'create_project_in_db',
  description:
    'Creates a new project record in the database.',
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
    context.app.log.info(`[create_project_in_db] Creating project '${input.name}'`);
    try {
      const projectsService = getProjectsService(context);
      const newProject = await projectsService.createProject(
        {
          name: input.name,
          description: input.description,
          organizationId: input.organizationId,
        },
        input.userId
      );
      return newProject;
    } catch (error: any) {
      context.app.log.error(
        error,
        `[create_project_in_db] Failed to create project "${input.name}"`
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
       userId: {
        type: 'string',
        description: 'The ID of the user performing the update.',
      },
    },
    required: ['projectId', 'architecture', 'userId'],
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
      architecture: any; 
      userId: string;
    }
  ): Promise<any> {
    context.app.log.info(
      `[update_project_from_architecture] Updating project '${input.projectId}'`
    );
    try {
      const projectsService = getProjectsService(context);
      await projectsService.updateProjectFromArchitecture(
        input.projectId,
        input.architecture,
        input.userId
      );
      return { success: true, projectId: input.projectId };
    } catch (error: any) {
      context.app.log.error(
        error,
        `[update_project_from_architecture] Failed to update project "${input.projectId}"`
      );
      throw error;
    }
  },
};
