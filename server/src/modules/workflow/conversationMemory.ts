/**
 * @file Conversation Memory System
 * 대화 히스토리를 벡터로 저장하고 의미적 검색을 제공
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ConversationMemory {
  id: string;
  userId: string;
  projectId: string;
  timestamp: Date;
  userMessage: string;
  aiResponse: string;
  context: {
    activeView?: string;
    activeFile?: string;
    activePreviewRoute?: string;
  };
  embedding?: number[];
  metadata: {
    intent?: string;
    success?: boolean;
    userSatisfaction?: 'positive' | 'negative' | 'neutral';
  };
}

export class ConversationMemoryService {
  private model: any;
  private memories: Map<string, ConversationMemory[]> = new Map();

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * 대화를 메모리에 저장
   */
  async storeConversation(
    userId: string,
    projectId: string,
    userMessage: string,
    aiResponse: string,
    context: any,
    metadata: Partial<ConversationMemory['metadata']> = {}
  ): Promise<void> {
    const memory: ConversationMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      projectId,
      timestamp: new Date(),
      userMessage,
      aiResponse,
      context,
      metadata: {
        success: true,
        userSatisfaction: 'neutral',
        ...metadata
      }
    };

    // 임베딩 생성
    try {
      memory.embedding = await this.generateEmbedding(userMessage);
    } catch (error) {
      console.warn('Failed to generate embedding:', error);
    }

    // 메모리 저장
    const key = `${userId}_${projectId}`;
    if (!this.memories.has(key)) {
      this.memories.set(key, []);
    }
    this.memories.get(key)!.push(memory);

    // 최대 100개까지만 유지 (메모리 절약)
    const memories = this.memories.get(key)!;
    if (memories.length > 100) {
      memories.splice(0, memories.length - 100);
    }
  }

  /**
   * 유사한 대화 검색
   */
  async findSimilarConversations(
    userId: string,
    projectId: string,
    query: string,
    limit: number = 5
  ): Promise<ConversationMemory[]> {
    const key = `${userId}_${projectId}`;
    const memories = this.memories.get(key) || [];

    if (memories.length === 0) return [];

    try {
      const queryEmbedding = await this.generateEmbedding(query);

      // 코사인 유사도 계산
      const similarities = memories
        .filter(m => m.embedding)
        .map(memory => ({
          memory,
          similarity: this.cosineSimilarity(queryEmbedding, memory.embedding!)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.memory);

      return similarities;
    } catch (error) {
      console.warn('Failed to find similar conversations:', error);
      // 임베딩 실패 시 키워드 기반 검색으로 폴백
      return this.keywordSearch(memories, query, limit);
    }
  }

  /**
   * 사용자 패턴 분석
   */
  analyzeUserPatterns(userId: string, projectId: string): {
    commonIntents: string[];
    preferredFileTypes: string[];
    averageResponseTime: number;
    successRate: number;
  } {
    const key = `${userId}_${projectId}`;
    const memories = this.memories.get(key) || [];

    const intents = memories.map(m => m.metadata.intent).filter(Boolean);
    const fileTypes = memories
      .map(m => m.context.activeFile?.split('.').pop())
      .filter(Boolean);

    return {
      commonIntents: this.getMostCommon(intents),
      preferredFileTypes: this.getMostCommon(fileTypes),
      averageResponseTime: 0, // TODO: 구현
      successRate: memories.filter(m => m.metadata.success).length / memories.length || 0
    };
  }

  /**
   * 임베딩 생성
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // 간단한 해시 기반 임베딩 (실제로는 OpenAI embeddings API 사용 권장)
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0);

    for (let i = 0; i < text.length && i < 384; i++) {
      embedding[i] = (text.charCodeAt(i) + hash) % 100 / 100;
    }

    return embedding;
  }

  /**
   * 코사인 유사도 계산
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 키워드 기반 검색 (폴백)
   */
  private keywordSearch(
    memories: ConversationMemory[],
    query: string,
    limit: number
  ): ConversationMemory[] {
    const queryWords = query.toLowerCase().split(' ');

    return memories
      .map(memory => ({
        memory,
        score: queryWords.reduce((score, word) => {
          const userMatch = memory.userMessage.toLowerCase().includes(word) ? 1 : 0;
          const aiMatch = memory.aiResponse.toLowerCase().includes(word) ? 0.5 : 0;
          return score + userMatch + aiMatch;
        }, 0)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.memory);
  }

  /**
   * 가장 빈번한 항목 찾기
   */
  private getMostCommon(items: string[]): string[] {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([item]) => item);
  }

  /**
   * 간단한 해시 함수
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer로 변환
    }
    return Math.abs(hash);
  }
}
