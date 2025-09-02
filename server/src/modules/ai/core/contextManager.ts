export class UserContext {
  constructor(userId, sessionId) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.data = new Map();
    this.metadata = {};
  }

  set(key, value) {
    this.data.set(key, value);
  }

  get(key) {
    return this.data.get(key);
  }

  has(key) {
    return this.data.has(key);
  }
}

export class ChatMessage {
  constructor(content, role = 'user', metadata = {}) {
    this.content = content;
    this.role = role;
    this.metadata = metadata;
    this.timestamp = new Date();
  }
}

export const contextManager = {
  contexts: new Map(),

  createContext(userId, sessionId) {
    const context = new UserContext(userId, sessionId);
    this.contexts.set(sessionId, context);
    return context;
  },

  getContext(sessionId) {
    return this.contexts.get(sessionId);
  },

  removeContext(sessionId) {
    return this.contexts.delete(sessionId);
  }
};
