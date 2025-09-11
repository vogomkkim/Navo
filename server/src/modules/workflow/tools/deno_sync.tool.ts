import { z } from 'zod';
import { ExecutionContext, Tool } from '../types';
import { ProjectsService } from '../../projects/projects.service';

// Inputs allow targeting a subdirectory (default '/functions') and an endpoint URL for deployment provider
const SyncInputSchema = z.object({
  rootDir: z.string().default('/functions'),
  provider: z.enum(['deno_deploy', 'lovable']).default('deno_deploy'),
  endpoint: z.string().url().describe('Provider API endpoint for syncing code'),
  apiKey: z.string().describe('API key or token for provider'),
});

export const syncDenoFunctionsTool: Tool = {
  name: 'sync_deno_functions',
  description: 'Synchronizes serverless function source files under a VFS path with the provider (e.g., Deno Deploy).',
  inputSchema: SyncInputSchema as unknown as Record<string, any>,
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      syncedCount: { type: 'number' },
    },
  },
  async execute(context: ExecutionContext, input: z.infer<typeof SyncInputSchema>) {
    const app = context.app;
    const { rootDir, provider, endpoint, apiKey } = SyncInputSchema.parse(input);

    if (!context.projectId || !context.userId) {
      throw new Error('Project and user context are required');
    }

    const projectsService = new ProjectsService(app);
    // Collect all files under the rootDir
    const files = await (projectsService as any).vfsRepository.listNodesUnderPath(context.projectId, rootDir);
    const fileNodes = files.filter((n: any) => n.nodeType === 'FILE');

    // POST all files as-is to provider (batch or individual). Here: naive individual upload.
    let synced = 0;
    for (const node of fileNodes) {
      if (!node.content) continue;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          provider,
          path: `${rootDir}/${node.name}`,
          content: node.content,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Sync failed for ${node.name}: ${res.status} ${text}`);
      }
      synced += 1;
    }

    app.log.info(`[sync_deno_functions] Synced ${synced} file(s) from ${rootDir}`);
    return { success: true, syncedCount: synced };
  },
};
