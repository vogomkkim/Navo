/**
 * @file Message Queue System
 * 비동기적으로 메시지를 저장하는 큐 시스템
 */

import { ConversationMemoryService } from './conversationMemory';

export interface QueuedMessage {
  id: string;
  userId: string;
  projectId: string;
  userMessage: string;
  aiResponse: string;
  context: any;
  metadata: {
    intent?: string;
    success?: boolean;
    userSatisfaction?: 'positive' | 'negative' | 'neutral';
  };
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private memoryService: ConversationMemoryService;
  private batchSize = 5;
  private processingInterval = 1000; // 1초마다 처리

  constructor() {
    this.memoryService = new ConversationMemoryService();
    this.startProcessing();
  }

  /**
   * 메시지를 큐에 추가
   */
  enqueue(message: Omit<QueuedMessage, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>): void {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.queue.push(queuedMessage);
    console.log(`[MessageQueue] Message queued: ${queuedMessage.id}`);
  }

  /**
   * 큐 처리 시작
   */
  private startProcessing(): void {
    setInterval(() => {
      if (!this.processing && this.queue.length > 0) {
        this.processQueue();
      }
    }, this.processingInterval);
  }

  /**
   * 큐 처리
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);

    console.log(`[MessageQueue] Processing batch of ${batch.length} messages`);

    const promises = batch.map(message => this.processMessage(message));

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('[MessageQueue] Batch processing error:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * 개별 메시지 처리
   */
  private async processMessage(message: QueuedMessage): Promise<void> {
    try {
      await this.memoryService.storeConversation(
        message.userId,
        message.projectId,
        message.userMessage,
        message.aiResponse,
        message.context,
        message.metadata
      );

      console.log(`[MessageQueue] Message stored successfully: ${message.id}`);
    } catch (error) {
      console.error(`[MessageQueue] Failed to store message ${message.id}:`, error);

      // 재시도 로직
      if (message.retryCount < message.maxRetries) {
        message.retryCount++;
        this.queue.push(message); // 다시 큐에 추가
        console.log(`[MessageQueue] Message ${message.id} queued for retry (${message.retryCount}/${message.maxRetries})`);
      } else {
        console.error(`[MessageQueue] Message ${message.id} failed after ${message.maxRetries} retries`);
        // 최종 실패 시 로그만 남기고 버림
      }
    }
  }

  /**
   * 큐 상태 조회
   */
  getStatus(): {
    queueLength: number;
    processing: boolean;
    batchSize: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      batchSize: this.batchSize
    };
  }

  /**
   * 큐 비우기 (테스트용)
   */
  clear(): void {
    this.queue = [];
    console.log('[MessageQueue] Queue cleared');
  }
}

// 싱글톤 인스턴스
export const messageQueue = new MessageQueue();
