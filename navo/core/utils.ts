import * as fs from 'fs';

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Simple in-memory checkpoint store for resilience features
export interface CheckpointStore {
  get(nodeName: string): Promise<unknown | undefined>;
  set(nodeName: string, value: unknown): Promise<void>;
  clear(nodeName?: string): Promise<void>;
}

export class InMemoryCheckpointStore implements CheckpointStore {
  private store: Map<string, unknown> = new Map();

  async get(nodeName: string): Promise<unknown | undefined> {
    return this.store.get(nodeName);
  }

  async set(nodeName: string, value: unknown): Promise<void> {
    this.store.set(nodeName, value);
  }

  async clear(nodeName?: string): Promise<void> {
    if (nodeName) {
      this.store.delete(nodeName);
      return;
    }
    this.store.clear();
  }
}
