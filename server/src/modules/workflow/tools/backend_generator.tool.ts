import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ExecutionContext, Tool } from '../types';
import { ProjectsService } from '@/modules/projects/projects.service';

const RequestObjectSchema = z.object({
  params: z.record(z.object({ type: z.string(), description: z.string() })).optional(),
  body: z.record(z.object({ type: z.string(), description: z.string() })).optional(),
});

const ResponseObjectSchema = z.record(z.object({
  description: z.string(),
  body: z.record(z.object({ type: z.string(), description: z.string() })).optional(),
}));

const EndpointObjectSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'POST', 'PATCH', 'DELETE']),
  description: z.string(),
  request: RequestObjectSchema.optional(),
  response: ResponseObjectSchema,
});

const ApiBlueprintSchema = z.object({
  blueprintType: z.literal('API_BLUEPRINT_V1'),
  targetPath: z.string().optional().describe("The full path where the generated code should be saved, e.g., '/src/routes/user.routes.ts'"),
  endpoints: z.array(EndpointObjectSchema),
});

type ApiBlueprint = z.infer<typeof ApiBlueprintSchema>;

export class BackendGeneratorTool implements Tool {
  public name = 'generate_backend_code_from_plan';
  public description = 'Generates Fastify backend route code from an API Blueprint and saves it to the VFS.';
  public inputSchema = ApiBlueprintSchema as unknown as Record<string, any>;
  public outputSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      filePath: { type: 'string' },
    },
  } as Record<string, any>;

  async execute(context: ExecutionContext, inputs: ApiBlueprint): Promise<any> {
    const app = context.app as FastifyInstance;
    // 1. Validate the blueprint against the detailed schema
    try {
      ApiBlueprintSchema.parse(inputs);
    } catch (error) {
      app.log.error({ error, projectId: context.projectId }, `[${this.name}] Invalid API Blueprint provided.`);
      throw new Error(`Invalid API Blueprint: ${error instanceof Error ? error.message : String(error)}`);
    }

    const projectsService = new ProjectsService(app);
    if (!context.projectId || !context.userId) {
      throw new Error('Project and user context are required');
    }
    app.log.info(`[${this.name}] Starting backend code generation for project ${context.projectId}`);

    const generatedCode = this.generateCodeFromBlueprint(inputs);

    const targetFilePath = inputs.targetPath || '/src/routes.ts';
    const targetFile = await projectsService.findOrCreateVfsNodeByPath(context.projectId, context.userId, targetFilePath);

    if (!targetFile) {
      throw new Error(`Failed to find or create target file at ${targetFilePath}`);
    }

    await projectsService.updateVfsNodeContent(targetFile.id, context.projectId, context.userId, generatedCode);

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

    type Endpoint = z.infer<typeof EndpointObjectSchema>;
    const routesCode = blueprint.endpoints.map((endpoint: Endpoint) => {
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
    }).join('\n');

    return header + routesCode + footer;
  }
}
