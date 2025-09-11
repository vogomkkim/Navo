import { z } from 'zod';
import { ExecutionContext, Tool } from '../types';
import { ProjectsService } from '../../projects/projects.service';

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
  targetPath: z.string().optional().describe("Optional root directory for functions, defaults to '/functions'"),
  endpoints: z.array(EndpointObjectSchema),
});

type ApiBlueprint = z.infer<typeof ApiBlueprintSchema>;

export class DenoFunctionsGeneratorTool implements Tool {
  public name = 'generate_deno_functions_from_blueprint';
  public description = 'Generates Deno serverless function scripts from an API Blueprint and saves them to the VFS.';
  public inputSchema = ApiBlueprintSchema as unknown as Record<string, any>;
  public outputSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      generated: { type: 'array', items: { type: 'string' } },
      rootDir: { type: 'string' },
    },
  } as Record<string, any>;

  async execute(context: ExecutionContext, inputs: ApiBlueprint): Promise<any> {
    const app = context.app;
    try {
      ApiBlueprintSchema.parse(inputs);
    } catch (error) {
      app.log.error({ error, projectId: context.projectId }, `[${this.name}] Invalid API Blueprint provided.`);
      throw new Error(`Invalid API Blueprint: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!context.projectId || !context.userId) {
      throw new Error('Project and user context are required');
    }

    const projectsService = new ProjectsService(app);
    const rootDir = inputs.targetPath || '/functions';

    const generatedPaths: string[] = [];
    for (const ep of inputs.endpoints) {
      const filePath = this.buildFunctionFilePath(rootDir, ep.method, ep.path);
      const content = this.generateDenoFunction(ep.method, ep.path, ep.description);
      const node = await projectsService.findOrCreateVfsNodeByPath(context.projectId, context.userId, filePath);
      await projectsService.updateVfsNodeContent(node.id, context.projectId, context.userId, content);
      generatedPaths.push(filePath);
    }

    app.log.info(`[${this.name}] Generated ${generatedPaths.length} Deno function file(s) under ${rootDir}`);
    return { success: true, generated: generatedPaths, rootDir };
  }

  private buildFunctionFilePath(rootDir: string, method: string, path: string): string {
    const sanitized = path
      .replace(/^\//, '')
      .replace(/:(\w+)/g, '[$1]')
      .replace(/\{(\w+)\}/g, '[$1]')
      .replace(/\//g, '_');
    const fileName = `${method.toLowerCase()}_${sanitized || 'root'}.ts`;
    return `${rootDir}/${fileName}`;
  }

  private generateDenoFunction(method: string, path: string, description: string): string {
    const upper = method.toUpperCase();
    return `// Auto-generated serverless function for ${upper} ${path}
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "${upper}") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // TODO: Implement - ${description}
  // Hint: const url = new URL(req.url); // url.pathname, url.searchParams
  // const body = req.headers.get('content-type')?.includes('application/json') ? await req.json() : undefined;

  return new Response(JSON.stringify({ message: 'Not Implemented' }), {
    status: 501,
    headers: { 'content-type': 'application/json' }
  });
});
`;
  }
}
