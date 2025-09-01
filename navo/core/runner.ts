import type { GraphNode, NodeContext } from './node.js';
import { validateDag, topologicalGroups } from './graph.js';

export type RunnerOptions = {
  concurrency?: number; // max parallel per group
  timeoutMs?: number; // per node timeout (legacy)
  // Detailed error-handling & observability
  onNodeStart?: (name: string) => void | Promise<void>;
  onNodeSuccess?: (
    name: string,
    ms: number,
    result: unknown
  ) => void | Promise<void>;
  onNodeFailure?: (name: string, error: unknown) => void | Promise<void>;
  // Global defaults for resiliency controls
  defaultRetries?: number;
  defaultRetryDelayMs?: number;
  defaultExponentialBackoff?: boolean;
  shouldRetryGlobal?: (error: unknown, node: GraphNode) => boolean;
  // Partial success: if true, keep going on independent branches when a node fails
  allowPartialSuccess?: boolean;
};

export type RunResult = {
  outputs: Map<string, unknown>;
  succeeded: Set<string>;
  failed: Map<string, unknown>; // name -> error
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
  validateDag(nodes);
  const groups = topologicalGroups(nodes);
  const outputs = new Map<string, unknown>();
  const ctx: NodeContext = { ...baseCtx, outputs };
  const nameToNode = new Map(nodes.map((n) => [n.name, n]));

  const succeeded = new Set<string>();
  const failed = new Map<string, unknown>();
  const skipped = new Set<string>();

  const perGroupConcurrency = Math.max(1, options.concurrency ?? Infinity);
  for (const group of groups) {
    // Respect dependencies: skip nodes whose deps failed unless partial success is allowed
    const schedulable = group.filter((name) => {
      const node = nameToNode.get(name)!;
      const deps = node.deps ?? [];
      // If any dependency failed or was skipped, this node cannot run
      const depFailed = deps.some((d) => failed.has(d) || skipped.has(d));
      if (depFailed) {
        skipped.add(name);
        return false;
      }
      return true;
    });

    const queue = [...schedulable];
    const running: Promise<void>[] = [];

    const runOne = async (name: string): Promise<void> => {
      const node = nameToNode.get(name)!;
      await options.onNodeStart?.(name);
      baseCtx.logger.info(`START ${name}`);
      const start = Date.now();
      try {
        const result = await executeNodeWithResilience(node, ctx, options);
        outputs.set(name, result);
        succeeded.add(name);
        const ms = Date.now() - start;
        baseCtx.logger.info(`DONE ${name}`, { ms });
        await options.onNodeSuccess?.(name, ms, result);
      } catch (err) {
        failed.set(name, err);
        baseCtx.logger.error(`FAIL ${name}`, { error: String(err) });
        await options.onNodeFailure?.(name, err);
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

  return { outputs, succeeded, failed, skipped };
}

async function withTimeout<T>(p: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs || !Number.isFinite(timeoutMs)) return p;
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function executeNodeWithResilience(
  node: GraphNode,
  ctx: NodeContext,
  options: RunnerOptions
): Promise<unknown> {
  const retries = node.retries ?? options.defaultRetries ?? 0;
  const baseDelay = node.retryDelayMs ?? options.defaultRetryDelayMs ?? 0;
  const useExponential =
    node.exponentialBackoff ?? options.defaultExponentialBackoff ?? false;

  const shouldRetry = (error: unknown): boolean => {
    if (node.shouldRetry) return node.shouldRetry(error);
    if (options.shouldRetryGlobal)
      return options.shouldRetryGlobal(error, node);
    return retries > 0; // default heuristic: if retries configured, retry any error
  };

  const maybeCheckpointLoad = async (): Promise<unknown | undefined> => {
    if (!node.useCheckpoint || !ctx.checkpoint) return undefined;
    return ctx.checkpoint.get(node.name);
  };

  const maybeCheckpointSave = async (value: unknown): Promise<void> => {
    if (!node.useCheckpoint || !ctx.checkpoint) return;
    await ctx.checkpoint.set(node.name, value);
  };

  // If checkpoint exists, return it directly
  const cached = await maybeCheckpointLoad();
  if (cached !== undefined) return cached;

  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retries) {
    try {
      const result = await node.run(ctx);
      await maybeCheckpointSave(result);
      return result;
    } catch (err) {
      lastError = err;
      await node.onFailure?.(ctx, err);
      if (!shouldRetry(err) || attempt === retries) {
        // Try fallback if available
        if (node.fallback) {
          try {
            const fallbackResult = await node.fallback(ctx, err);
            await maybeCheckpointSave(fallbackResult);
            return fallbackResult;
          } catch (fallbackErr) {
            // Fallback failed; execute compensate if present and rethrow original
            await node.compensate?.(ctx, 'fallback_failed');
            throw fallbackErr;
          }
        }
        // No retry/fallback left; run compensation and rethrow
        await node.compensate?.(ctx, 'failed');
        throw err;
      }

      // Will retry
      const delay = useExponential
        ? baseDelay * Math.pow(2, attempt)
        : baseDelay;
      if (delay > 0) await sleep(delay);
      attempt += 1;
    }
  }

  // Should not reach here
  throw lastError ?? new Error('Unknown error');
}
