export type NodeContext = {
  logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
  config?: Record<string, unknown>;
  services?: Record<string, unknown>;
  outputs: Map<string, unknown>;
  runId?: string;
  // Optional checkpoint access for nodes that wish to persist intermediate results
  checkpoint?: {
    get: (nodeName: string) => Promise<unknown | undefined>;
    set: (nodeName: string, value: unknown) => Promise<void>;
    clear: (nodeName?: string) => Promise<void>;
  };
};

export interface GraphNode {
  name: string;
  deps?: string[];
  run: (ctx: NodeContext) => Promise<unknown>;
  // Error handling & resiliency options (optional per-node overrides)
  retries?: number; // max retry attempts (excluding the initial try)
  retryDelayMs?: number; // base delay between retries
  exponentialBackoff?: boolean; // if true, delay grows exponentially
  shouldRetry?: (error: unknown) => boolean; // filter which errors are retried
  fallback?: (ctx: NodeContext, error: unknown) => Promise<unknown>; // alternate path
  compensate?: (ctx: NodeContext, reason: string) => Promise<void>; // compensation/rollback
  useCheckpoint?: boolean; // if true, read/write checkpoint for this node
  onFailure?: (ctx: NodeContext, error: unknown) => Promise<void>; // node-level failure hook
}
