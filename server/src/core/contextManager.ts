export interface CurrentProjectContext {
  id: string;
  name: string;
  description?: string | null;
}

export interface CurrentComponentContext {
  id?: string;
  displayName: string;
  type?: string;
}

export interface StoredMessage {
  role: 'user' | 'assistant' | 'system';
  content: any;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class UserContext {
  userId: string;
  sessionId: string;
  data: Map<string, unknown>;
  metadata: Record<string, unknown>;
  currentProject?: CurrentProjectContext;
  currentComponent?: CurrentComponentContext;
  messages: StoredMessage[] = [];

  constructor(userId: string, sessionId: string) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.data = new Map();
    this.metadata = {};
  }

  set(key: string, value: unknown) {
    this.data.set(key, value);
  }

  get<T = unknown>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  has(key: string): boolean {
    return this.data.has(key);
  }
}

export class ChatMessage {
  content: any;
  role: 'user' | 'assistant' | 'system';
  metadata: Record<string, unknown>;
  timestamp: Date;

  constructor(
    content: any,
    role: 'user' | 'assistant' | 'system' = 'user',
    metadata: Record<string, unknown> = {},
  ) {
    this.content = content;
    this.role = role;
    this.metadata = metadata;
    this.timestamp = new Date();
  }
}

class ContextManager {
  private contexts = new Map<string, UserContext>();

  createContext(userId: string, sessionId: string): UserContext {
    const context = new UserContext(userId, sessionId);
    this.contexts.set(sessionId, context);
    return context;
  }

  getContext(sessionId: string): UserContext | undefined {
    return this.contexts.get(sessionId);
  }

  getOrCreateContext(userId: string): UserContext {
    // 간단한 전략: userId를 sessionId로 재사용 (실제 구현에서는 세션 저장소 사용)
    const sessionId = userId;
    return this.getContext(sessionId) ?? this.createContext(userId, sessionId);
  }

  removeContext(sessionId: string): boolean {
    return this.contexts.delete(sessionId);
  }

  async getMessages(sessionId: string, limit = 10): Promise<ChatMessage[]> {
    const ctx = this.getContext(sessionId);
    if (!ctx) return [];
    const recent = ctx.messages.slice(-limit);
    return recent.map(
      (m) => new ChatMessage(m.content, m.role, m.metadata ?? {}),
    );
  }

  async addMessage(
    sessionId: string,
    userId: string,
    role: StoredMessage['role'],
    content: any,
    _traceId?: string,
    _parentId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const ctx =
      this.getContext(sessionId) ?? this.createContext(userId, sessionId);
    ctx.messages.push({ role, content, timestamp: new Date(), metadata });
  }

  async updateLastAction(
    sessionId: string,
    userId: string,
    source: string,
    action: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const ctx =
      this.getContext(sessionId) ?? this.createContext(userId, sessionId);
    ctx.set('lastAction', { source, action, data, at: new Date() });
  }

  async setCurrentProject(
    sessionId: string,
    userId: string,
    projectId: string,
    name?: string,
    description?: string | null,
  ): Promise<void> {
    const ctx =
      this.getContext(sessionId) ?? this.createContext(userId, sessionId);
    ctx.currentProject = {
      id: projectId,
      name: name ?? projectId,
      description: description ?? null,
    };
  }
}

export const contextManager = new ContextManager();
