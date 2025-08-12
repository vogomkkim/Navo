import type { GraphNode, NodeContext } from './node.js';
import { validateDag, topologicalGroups } from './graph.js';

export type RunnerOptions = {
  concurrency?: number; // max parallel per group
  timeoutMs?: number; // per node
};

export async function runGraph(
  nodes: GraphNode[],
  baseCtx: Omit<NodeContext, 'outputs'>,
  options: RunnerOptions = {}
): Promise<Map<string, unknown>> {
  validateDag(nodes);
  const groups = topologicalGroups(nodes);
  const outputs = new Map<string, unknown>();
  const ctx: NodeContext = { ...baseCtx, outputs };
  const nameToNode = new Map(nodes.map((n) => [n.name, n]));

  const perGroupConcurrency = Math.max(1, options.concurrency ?? Infinity);
  for (const group of groups) {
    const queue = [...group];
    const running: Promise<void>[] = [];

    const runOne = async (name: string): Promise<void> => {
      const node = nameToNode.get(name)!;
      baseCtx.logger.info(`START ${name}`);
      const start = Date.now();
      try {
        const result = await withTimeout(node.run(ctx), options.timeoutMs);
        outputs.set(name, result);
        baseCtx.logger.info(`DONE ${name}`, { ms: Date.now() - start });
      } catch (err) {
        baseCtx.logger.error(`FAIL ${name}`, { error: String(err) });
        throw err;
      }
    };

    while (queue.length > 0 || running.length > 0) {
      while (queue.length > 0 && running.length < perGroupConcurrency) {
        const name = queue.shift()!;
        const p = runOne(name).then(() => {
          const idx = running.indexOf(p);
          if (idx >= 0) running.splice(idx, 1);
        });
        running.push(p);
      }
      if (running.length > 0) {
        await Promise.race(running);
      }
    }
  }
  return outputs;
}

async function withTimeout<T>(p: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs || !Number.isFinite(timeoutMs)) return p;
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }, (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}