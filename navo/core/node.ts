export type NodeContext = {
  logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
  config?: Record<string, unknown>;
  services?: Record<string, unknown>;
  outputs: Map<string, unknown>;
};

export interface GraphNode {
  name: string;
  deps?: string[];
  run: (ctx: NodeContext) => Promise<unknown>;
}
