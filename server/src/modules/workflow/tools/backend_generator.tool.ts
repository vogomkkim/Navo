import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Tool } from './tool';
import { ProjectsService } from '@/modules/projects/projects.service';

const ApiBlueprintSchema = z.object({
  blueprintType: z.literal('API_BLUEPRINT_V1'),
  endpoints: z.array(
    z.object({
      path: z.string(),
      method: z.enum(['GET', 'POST', 'PATCH', 'DELETE']),
      description: z.string(),
      // We'll keep request/response schemas for future validation logic
    })
  ),
});

type ApiBlueprint = z.infer<typeof ApiBlueprintSchema>;

export class BackendGeneratorTool implements Tool {
  public name = 'generate_backend_code_from_plan';
  public description = 'Generates Fastify backend route code from an API Blueprint and saves it to the VFS.';
  
  public inputSchema = ApiBlueprintSchema;

  async execute(app: FastifyInstance, inputs: ApiBlueprint, projectId: string, userId: string): Promise<any> {
    const projectsService = new ProjectsService(app);
    app.log.info(`[${this.name}] Starting backend code generation for project ${projectId}`);

    const generatedCode = this.generateCodeFromBlueprint(inputs);

    const targetFilePath = '/src/routes.ts';
    let targetFile = await projectsService.findVfsNodeByPath(projectId, userId, targetFilePath);

    // If the file doesn't exist, create it first (along with parent dirs if needed)
    if (!targetFile) {
      const srcDir = await projectsService.findVfsNodeByPath(projectId, userId, '/src');
      if (!srcDir) {
        const root = await projectsService.findVfsNodeByPath(projectId, userId, '/');
        if (!root) throw new Error('Root directory not found.');
        const newSrcDir = await projectsService.createVfsNode(projectId, userId, { parentId: root.id, nodeType: 'DIRECTORY', name: 'src' });
        targetFile = await projectsService.createVfsNode(projectId, userId, { parentId: newSrcDir.id, nodeType: 'FILE', name: 'routes.ts', content: '' });
      } else {
        targetFile = await projectsService.createVfsNode(projectId, userId, { parentId: srcDir.id, nodeType: 'FILE', name: 'routes.ts', content: '' });
      }
    }

    if (!targetFile) {
      throw new Error(`Failed to find or create target file at ${targetFilePath}`);
    }

    await projectsService.updateVfsNodeContent(targetFile.id, projectId, userId, generatedCode);

    const summary = `Successfully generated ${inputs.endpoints.length} API endpoint(s) and saved to ${targetFilePath}.`;
    app.log.info(`[${this.name}] ${summary}`);
    return { success: true, message: summary, filePath: targetFilePath };
  }

  private generateCodeFromBlueprint(blueprint: ApiBlueprint): string {
    const header = `
import { FastifyInstance } from 'fastify';

// This is an auto-generated file. Do not edit manually.
// AI-generated business logic placeholders are provided below.

export async function generatedRoutes(app: FastifyInstance) {
`;

    const footer = `
}
`;

    const routesCode = blueprint.endpoints.map(endpoint => {
      const methodName = endpoint.method.toLowerCase();
      return `
  // Description: ${endpoint.description}
  app.${methodName}('${endpoint.path}', async (request, reply) => {
    // TODO: Implement business logic for "${endpoint.description}"
    // Example: const data = await someService.fetchData(request.params);
    // reply.send(data);
    
    reply.status(501).send({ message: 'Not Implemented' });
  });
`;
    }).join('
');

    return header + routesCode + footer;
  }
}
