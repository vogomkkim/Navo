export type NodeContext = {
  logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
  config?: Record<string, unknown>;
  services?: Record<string, unknown>;
  outputs: Map<string, unknown>;
  runId?: string;
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
  retries?: number;
  retryDelayMs?: number;
  exponentialBackoff?: boolean;
  shouldRetry?: (error: unknown) => boolean;
  fallback?: (ctx: NodeContext, error: unknown) => Promise<unknown>;
  compensate?: (ctx: NodeContext, reason: string) => Promise<void>;
  useCheckpoint?: boolean;
  onFailure?: (ctx: NodeContext, error: unknown) => Promise<void>;
}
