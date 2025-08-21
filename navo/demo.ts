import { runGraph } from './core/runner.js';
import type { GraphNode } from './core/node.js';
import { generateImage } from './nodes/generateImage.js';
import { writeCopy } from './nodes/writeCopy.js';
import { buildPage } from './nodes/buildPage.js';
import { deploySite } from './nodes/deploySite.js';

async function main(): Promise<void> {
  const nodes: GraphNode[] = [writeCopy, generateImage, buildPage, deploySite];
  const outputs = await runGraph(
    nodes,
    {
      logger: {
        info: (m, meta) => console.log(`[I] ${m}`, meta ?? ''),
        error: (m, meta) => console.error(`[E] ${m}`, meta ?? ''),
      },
    },
    { concurrency: 2, timeoutMs: 5_000 }
  );

  const deployed = outputs.get('deploySite') as { url: string } | undefined;
  console.log('Demo deployed URL:', deployed?.url);
}

main().catch((err) => {
  console.error('Demo failed', err);
  process.exit(1);
});
