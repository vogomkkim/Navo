import type { GraphNode, NodeContext } from './node.js';

export type RunnerOptions = {
  concurrency?: number;
  timeoutMs?: number;
  onNodeStart?: (name: string) => void | Promise<void>;
  onNodeSuccess?: (name: string, ms: number, result: unknown) => void | Promise<void>;
  onNodeFailure?: (name: string, error: unknown) => void | Promise<void>;
  defaultRetries?: number;
  defaultRetryDelayMs?: number;
  defaultExponentialBackoff?: boolean;
  shouldRetryGlobal?: (error: unknown, node: GraphNode) => boolean;
  allowPartialSuccess?: boolean;
};

export type RunResult = {
  outputs: Map<string, unknown>;
  succeeded: Set<string>;
  failed: Map<string, unknown>;
  skipped: Set<string>;
};

export async function runGraph(
  nodes: GraphNode[],
  baseCtx: Omit<NodeContext, 'outputs'>,
  options: RunnerOptions = {}
): Promise<Map<string, unknown>> {
  const result = await runGraphDetailed(nodes, baseCtx, options);
  return result.outputs;
}

export async function runGraphDetailed(
  nodes: GraphNode[],
  baseCtx: Omit<NodeContext, 'outputs'>,
  options: RunnerOptions = {}
): Promise<RunResult> {
  const outputs = new Map<string, unknown>();
  const ctx: NodeContext = { ...baseCtx, outputs };
  const nameToNode = new Map(nodes.map((n) => [n.name, n]));

  const succeeded = new Set<string>();
  const failed = new Map<string, unknown>();
  const skipped = new Set<string>();

  const perGroupConcurrency = Math.max(1, options.concurrency ?? Infinity);

  // 간단한 실행 로직
  for (const node of nodes) {
    await options.onNodeStart?.(node.name);
    const start = Date.now();

    try {
      const result = await node.run(ctx);
      outputs.set(node.name, result);
      succeeded.add(node.name);
      const ms = Date.now() - start;
      await options.onNodeSuccess?.(node.name, ms, result);
    } catch (err) {
      failed.set(node.name, err);
      await options.onNodeFailure?.(node.name, err);
    }
  }

  return { outputs, succeeded, failed, skipped };
}
