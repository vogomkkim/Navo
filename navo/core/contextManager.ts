import { db } from "../db/db.js";
import {
  userSessions,
  chatMessages,
  chatSessionSummaries,
  users,
  projects,
  componentDefinitions,
} from "../db/schema.js";
import { eq, and, desc, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { sql } from "drizzle-orm";

/**
 * 사용자 컨텍스트 인터페이스
 */
export interface UserContext {
  sessionId: string;
  userId: string;
  title?: string;
  currentProject?: {
    id: string;
    name: string;
    description?: string;
    structure?: any;
  };
  currentComponent?: {
    id: string;
    name: string;
    displayName: string;
    type: string;
  };
  status: "active" | "archived";
  expiresAt?: Date;
  version: number;
  lastAction?: {
    type: string;
    target: string;
    timestamp: Date;
    result?: any;
  };
  contextData?: any; // 추가 컨텍스트 데이터
  lastActivity: Date;
}

/**
 * 채팅 메시지 인터페이스
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: {
    message: string;
    [key: string]: any;
  };
  model?: string;
  tokens?: number;
  metadata?: any;
  createdAt: Date;
}

/**
 * 세션 요약 인터페이스
 */
export interface SessionSummary {
  id: string;
  sessionId: string;
  summary: string;
  lastMsgId?: string;
  tokenCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 컨텍스트 업데이트 인터페이스
 */
export interface ContextUpdate {
  currentProjectId?: string;
  currentComponentId?: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    message: string;
    timestamp: Date;
    metadata?: any;
  }>;
  lastAction?: {
    type: string;
    target: string;
    timestamp: Date;
    result?: any;
  };
  contextData?: any;
}

/**
 * ContextManager 클래스
 * 사용자 세션 및 대화 컨텍스트를 관리합니다.
 */
export class ContextManager {
  private static instance: ContextManager;
  private sessionCache: Map<string, UserContext> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분

  private constructor() {}

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * 세션 ID 생성
   */
  private generateSessionId(): string {
    return uuidv4();
  }

  /**
   * 사용자 컨텍스트 조회 또는 생성
   */
  async getOrCreateContext(userId: string): Promise<UserContext> {
    try {
      // 가장 최근 세션 조회
      const sessions = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
        .orderBy(desc(userSessions.updatedAt))
        .limit(1);

      if (sessions.length > 0) {
        // 기존 세션이 있으면 반환
        return await this.buildContextFromSession(sessions[0]);
      }

      // 세션이 없으면 새로 생성
      return await this.createSession(userId);
    } catch (error) {
      console.error("Error getting or creating context:", error);
      throw new Error("Failed to get or create user context");
    }
  }

  /**
   * 사용자 컨텍스트 조회 (기존 메서드 - 호환성 유지)
   */
  async getContext(sessionId: string, userId: string): Promise<UserContext> {
    // 캐시에서 먼저 확인
    const cacheKey = `${sessionId}-${userId}`;
    const cached = this.sessionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // 데이터베이스에서 세션 조회
      const session = await db
        .select()
        .from(userSessions)
        .where(
          and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId))
        )
        .limit(1);

      if (session.length === 0) {
        // 세션이 없으면 새로 생성
        return await this.createSession(userId);
      }

      const sessionData = session[0];
      const sessionDataJson = sessionData.sessionData as any;

      // 현재 프로젝트 정보 조회
      let currentProject: UserContext["currentProject"] = undefined;
      if (sessionDataJson.currentProjectId) {
        const project = await db
          .select()
          .from(projects)
          .where(eq(projects.id, sessionDataJson.currentProjectId))
          .limit(1);

        if (project.length > 0) {
          currentProject = {
            id: project[0].id,
            name: project[0].name,
            description: project[0].description || undefined,
            structure: sessionDataJson.projectStructure || undefined,
          };
        }
      }

      // 현재 컴포넌트 정보 조회
      let currentComponent: UserContext["currentComponent"] = undefined;
      if (sessionDataJson.currentComponentId) {
        const component = await db
          .select()
          .from(componentDefinitions)
          .where(
            eq(componentDefinitions.id, sessionDataJson.currentComponentId)
          )
          .limit(1);

        if (component.length > 0) {
          currentComponent = {
            id: component[0].id,
            name: component[0].name,
            displayName: component[0].displayName,
            type: component[0].category,
          };
        }
      }

      const context: UserContext = {
        sessionId: sessionData.id,
        userId: sessionData.userId,
        title: sessionDataJson.title || undefined,
        currentProject,
        currentComponent,
        status: "active",
        version: sessionData.version,
        lastAction: sessionDataJson.lastAction || undefined,
        contextData: sessionDataJson.contextData || {},
        lastActivity: sessionData.updatedAt,
      };

      // 캐시에 저장
      this.sessionCache.set(cacheKey, context);

      // TTL 설정
      setTimeout(() => {
        this.sessionCache.delete(cacheKey);
      }, this.CACHE_TTL);

      return context;
    } catch (error) {
      console.error("Error getting context:", error);
      throw new Error("Failed to get user context");
    }
  }

  /**
   * 세션 데이터로부터 컨텍스트 빌드
   */
  private async buildContextFromSession(
    sessionData: any
  ): Promise<UserContext> {
    const sessionDataJson = sessionData.sessionData as any;

    // 현재 프로젝트 정보 조회
    let currentProject: UserContext["currentProject"] = undefined;
    if (sessionDataJson.currentProjectId) {
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, sessionDataJson.currentProjectId))
        .limit(1);

      if (project.length > 0) {
        currentProject = {
          id: project[0].id,
          name: project[0].name,
          description: project[0].description || undefined,
          structure: sessionDataJson.projectStructure || undefined,
        };
      }
    }

    // 현재 컴포넌트 정보 조회
    let currentComponent: UserContext["currentComponent"] = undefined;
    if (sessionDataJson.currentComponentId) {
      const component = await db
        .select()
        .from(componentDefinitions)
        .where(eq(componentDefinitions.id, sessionDataJson.currentComponentId))
        .limit(1);

      if (component.length > 0) {
        currentComponent = {
          id: component[0].id,
          name: component[0].name,
          displayName: component[0].displayName,
          type: component[0].category,
        };
      }
    }

    const context: UserContext = {
      sessionId: sessionData.id,
      userId: sessionData.userId,
      title: sessionDataJson.title || undefined,
      currentProject,
      currentComponent,
      status: "active",
      version: sessionData.version,
      lastAction: sessionDataJson.lastAction || undefined,
      contextData: sessionDataJson.contextData || {},
      lastActivity: sessionData.updatedAt,
    };

    return context;
  }

  /**
   * 새 세션 생성
   */
  async createSession(userId: string, title?: string): Promise<UserContext> {
    try {
      const [session] = await db
        .insert(userSessions)
        .values({
          userId,
          sessionData: {
            title,
            currentProjectId: null,
            currentComponentId: null,
            lastAction: null,
            contextData: {},
          },
          version: 1,
        })
        .returning();

      const context: UserContext = {
        sessionId: session.id, // DB에서 생성된 UUID 사용
        userId: session.userId,
        title: title || undefined,
        status: "active",
        version: session.version,
        contextData: {},
        lastActivity: session.updatedAt,
      };

      // 캐시에 저장 (DB에서 생성된 ID 사용)
      const cacheKey = `${session.id}-${userId}`;
      this.sessionCache.set(cacheKey, context);

      return context;
    } catch (error) {
      console.error("Error creating session:", error);
      throw new Error("Failed to create user session");
    }
  }

  /**
   * 컨텍스트 업데이트
   */
  async updateContext(
    sessionId: string,
    userId: string,
    updates: ContextUpdate
  ): Promise<void> {
    try {
      // 현재 세션 데이터 조회
      const [currentSession] = await db
        .select()
        .from(userSessions)
        .where(
          and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId))
        );

      if (!currentSession) {
        throw new Error("Session not found");
      }

      // 기존 sessionData와 새로운 업데이트 병합
      const currentSessionData = (currentSession.sessionData as any) || {};
      const updatedSessionData = {
        ...currentSessionData,
        ...updates,
      };

      await db
        .update(userSessions)
        .set({
          sessionData: updatedSessionData,
          lastActivity: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId))
        );

      // 캐시 무효화
      const cacheKey = `${sessionId}-${userId}`;
      this.sessionCache.delete(cacheKey);
    } catch (error) {
      console.error("Error updating context:", error);
      throw new Error("Failed to update user context");
    }
  }

  /**
   * 대화 히스토리에 메시지 추가
   */
  async addMessage(
    sessionId: string,
    userId: string,
    role: "user" | "assistant" | "system" | "tool",
    content: { message: string; [key: string]: any },
    model?: string,
    tokens?: number,
    metadata?: any
  ): Promise<string> {
    try {
      // 메시지 저장
      const [message] = await db
        .insert(chatMessages)
        .values({
          sessionId,
          messageType: role,
          content: content.message,
          metadata: {
            ...metadata,
            model,
            tokens,
            originalContent: content,
          },
        })
        .returning();

      // 세션 활동 시간 업데이트
      await db
        .update(userSessions)
        .set({
          lastActivity: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId))
        );

      return message.id;
    } catch (error) {
      console.error("Error adding message:", error);
      throw new Error("Failed to add message to conversation history");
    }
  }

  /**
   * 세션의 메시지 조회 (페이징 지원)
   */
  async getMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    try {
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit)
        .offset(offset);

      return messages.map((msg) => ({
        id: msg.id,
        sessionId: msg.sessionId,
        role: msg.messageType as "user" | "assistant" | "system" | "tool",
        content: {
          message: msg.content,
          ...(msg.metadata as any)?.originalContent,
        },
        model: (msg.metadata as any)?.model || undefined,
        tokens: (msg.metadata as any)?.tokens || undefined,
        metadata: msg.metadata || undefined,
        createdAt: msg.createdAt,
      }));
    } catch (error) {
      console.error("Error getting messages:", error);
      throw new Error("Failed to get conversation messages");
    }
  }

  /**
   * 세션 요약 생성/업데이트
   */
  async updateSessionSummary(
    sessionId: string,
    summary: string,
    lastMsgId: string,
    tokenCount?: number
  ): Promise<void> {
    try {
      // 기존 요약이 있는지 확인
      const [existingSummary] = await db
        .select()
        .from(chatSessionSummaries)
        .where(eq(chatSessionSummaries.sessionId, sessionId));

      if (existingSummary) {
        // 기존 요약 업데이트
        await db
          .update(chatSessionSummaries)
          .set({
            summary,
            lastMsgId,
            tokenCount: tokenCount || 0,
            updatedAt: new Date(),
          })
          .where(eq(chatSessionSummaries.sessionId, sessionId));
      } else {
        // 새 요약 생성
        await db.insert(chatSessionSummaries).values({
          sessionId,
          summary,
          lastMsgId,
          tokenCount: tokenCount || 0,
        });
      }
    } catch (error) {
      console.error("Error updating session summary:", error);
      throw new Error("Failed to update session summary");
    }
  }

  /**
   * 세션 요약 조회
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    try {
      const summary = await db
        .select()
        .from(chatSessionSummaries)
        .where(eq(chatSessionSummaries.sessionId, sessionId))
        .limit(1);

      if (summary.length === 0) {
        return null;
      }

      const summaryData = summary[0];

      return {
        id: summaryData.id,
        sessionId: summaryData.sessionId,
        summary: summaryData.summary,
        lastMsgId: summaryData.lastMsgId || undefined,
        tokenCount: summaryData.tokenCount || undefined,
        createdAt: summaryData.createdAt
          ? new Date(summaryData.createdAt)
          : new Date(),
        updatedAt: summaryData.updatedAt
          ? new Date(summaryData.updatedAt)
          : summaryData.createdAt
            ? new Date(summaryData.createdAt)
            : new Date(),
      };
    } catch (error) {
      console.error("Error getting session summary:", error);
      throw new Error("Failed to get session summary");
    }
  }

  /**
   * 현재 프로젝트 설정
   */
  async setCurrentProject(
    sessionId: string,
    userId: string,
    projectId: string
  ): Promise<void> {
    try {
      await this.updateContext(sessionId, userId, {
        currentProjectId: projectId,
        currentComponentId: undefined, // 프로젝트 변경 시 컴포넌트 초기화
      });
    } catch (error) {
      console.error("Error setting current project:", error);
      throw new Error("Failed to set current project");
    }
  }

  /**
   * 현재 컴포넌트 설정
   */
  async setCurrentComponent(
    sessionId: string,
    userId: string,
    componentId: string
  ): Promise<void> {
    try {
      await this.updateContext(sessionId, userId, {
        currentComponentId: componentId,
      });
    } catch (error) {
      console.error("Error setting current component:", error);
      throw new Error("Failed to set current component");
    }
  }

  /**
   * 마지막 액션 업데이트
   */
  async updateLastAction(
    sessionId: string,
    userId: string,
    actionType: string,
    target: string,
    result?: any
  ): Promise<void> {
    try {
      await this.updateContext(sessionId, userId, {
        lastAction: {
          type: actionType,
          target,
          timestamp: new Date(),
          result,
        },
      });
    } catch (error) {
      console.error("Error updating last action:", error);
      throw new Error("Failed to update last action");
    }
  }

  /**
   * 세션 아카이브
   */
  async archiveSession(sessionId: string, userId: string): Promise<void> {
    try {
      await db
        .update(userSessions)
        .set({
          status: "archived",
          updatedAt: new Date(),
        })
        .where(
          and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId))
        );

      // 캐시에서 제거
      const cacheKey = `${sessionId}-${userId}`;
      this.sessionCache.delete(cacheKey);
    } catch (error) {
      console.error("Error archiving session:", error);
      throw new Error("Failed to archive session");
    }
  }

  /**
   * 오래된 세션 정리 (24시간 이상 비활성)
   */
  async cleanupOldSessions(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 24시간 이상 비활성인 세션들을 아카이브 처리
      await db
        .update(userSessions)
        .set({
          status: "archived",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userSessions.status, "active"),
            sql`${userSessions.lastActivity} < ${twentyFourHoursAgo}`
          )
        );
    } catch (error) {
      console.error("Error cleaning up old sessions:", error);
    }
  }

  /**
   * 컨텍스트 요약 정보 반환
   */
  async getContextSummary(
    sessionId: string,
    userId: string
  ): Promise<{
    hasProject: boolean;
    hasComponent: boolean;
    messageCount: number;
    lastActivity: Date;
    title?: string;
    status: string;
  }> {
    try {
      const context = await this.getContext(sessionId, userId);

      // 메시지 수 조회
      const messageCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId));

      return {
        hasProject: !!context.currentProject,
        hasComponent: !!context.currentComponent,
        messageCount: messageCount[0]?.count || 0,
        lastActivity: context.lastActivity,
        title: context.title,
        status: context.status,
      };
    } catch (error) {
      console.error("Error getting context summary:", error);
      throw new Error("Failed to get context summary");
    }
  }
}

// 싱글톤 인스턴스 export
export const contextManager = ContextManager.getInstance();
