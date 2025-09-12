import { FastifyInstance } from 'fastify';
import { OrchestratorService } from '@/core/orchestrator/orchestrator.service';
import { WorkflowService } from './workflow.service';
import { WebSocket } from 'ws';
import type { WebSocket as WS, RawData } from 'ws';

// A simple in-memory connection manager
export const connectionManager = {
  conns: new Map<string, Set<WS>>(),

  add(projectId: string, socket: WS) {
    if (!this.conns.has(projectId)) {
      this.conns.set(projectId, new Set());
    }
    this.conns.get(projectId)!.add(socket);
    console.log(`[WebSocket] Connection added to project ${projectId}. Total: ${this.conns.get(projectId)!.size}`);
  },

  remove(projectId: string, socket: WS) {
    const projectConnections = this.conns.get(projectId);
    if (projectConnections) {
      projectConnections.delete(socket);
      console.log(`[WebSocket] Connection removed from project ${projectId}. Total: ${projectConnections.size}`);
      if (projectConnections.size === 0) {
        this.conns.delete(projectId);
      }
    }
  },

  broadcast(projectId: string, message: unknown) {
    const set = this.conns.get(projectId);
    if (!set) return;
    const msg = JSON.stringify(message);

    for (const s of set) {
      try {
        if (s.readyState === WebSocket.OPEN) {
          s.send(msg);
        } else {
          s.terminate();
          this.remove(projectId, s);
        }
      } catch {
        s.terminate();
        this.remove(projectId, s);
      }
    }
  },
};

function normalizeWS(raw: any): WS {
  // v11 방식: raw가 곧 WebSocket (send/close 존재)
  if (raw && typeof raw.send === 'function' && typeof raw.close === 'function') {
    return raw as WS;
  }
  // 구 방식: raw.socket 안에 WebSocket 인스턴스가 들어있음
  if (raw && raw.socket && typeof raw.socket.send === 'function') {
    return raw.socket as WS;
  }
  throw new TypeError('Invalid WebSocket handler arg: cannot resolve socket');
}

export function workflowController(app: FastifyInstance) {
  const orchestratorService = new OrchestratorService(app);
  const workflowService = new WorkflowService(app);

  // v11.2.0
  // WebSocket route for real-time progress
  app.get(
    '/api/ws/projects/:projectId',
    { websocket: true },
    (connection, request) => {
      console.log('--- [DEBUG] WebSocket Request Object ---');
      // We need to inspect all properties of the request object
      // to find where the URL and params are located.
      console.log({
        url: request.url,
        method: request.method,
        headers: request.headers,
        // The 'raw' property often contains the underlying Node.js request object
        rawUrl: request.raw?.url, 
      });
      console.log('--------------------------------------');
      
      // Immediately close for debugging, prevent further errors
      connection.socket.close(1011, 'Debugging connection.');
      return;

      // --- Original Logic (temporarily disabled) ---
      /*
      // 1. Origin Check (based on the provided example)
      const origin = request.headers.origin;
      if (process.env.NODE_ENV === 'development' && origin !== 'http://localhost:3000') {
        app.log.warn(`[WebSocket] Connection from disallowed origin: ${origin}`);
        connection.socket.close(1008, 'Origin not allowed');
        return;
      }

      // 2. Get projectId from params
      const { projectId } = request.params as { projectId: string };
      if (!projectId) {
        app.log.error('[WebSocket] Could not get projectId from request params');
        connection.socket.close(1011, 'Could not determine project ID.');
        return;
      }
      
      app.log.info(`[WebSocket] Connection established for project: ${projectId}`);
      connectionManager.add(projectId, connection.socket);

      connection.socket.on('message', message => {
        app.log.info(`[WebSocket] Received message from client for project ${projectId}: ${message.toString()}`);
      });

      connection.socket.on('close', () => {
        app.log.info(`[WebSocket] Connection closed for project: ${projectId}`);
        connectionManager.remove(projectId, connection.socket);
      });
      
      connection.socket.on('error', (error) => {
          app.log.error(error, `[WebSocket] Error on project ${projectId}`);
          connectionManager.remove(projectId, connection.socket);
      });
      */
    },
  );

  app.post(
    '/api/workflow/execute',
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      // ... existing execute logic
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          return reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
        }

        const { prompt, chatHistory, projectId } = request.body as {
          prompt: string;
          chatHistory: any[];
          projectId?: string;
        };

        if (!prompt) {
          return reply.status(400).send({ error: 'Prompt is required.' });
        }

        const result = await orchestratorService.handleRequest(prompt, { id: userId }, chatHistory || [], projectId);

        return reply.send(result);
      } catch (error: any) {
        app.log.error(error, 'Error in orchestrator service');
        return reply.status(500).send({
          error: 'Failed to handle request.',
          details: error.message,
        });
      }
    }
  );

  app.post(
    '/api/workflow/run',
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      // ... existing run logic
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          return reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
        }

        const { plan, projectId } = request.body as {
          plan: any;
          projectId?: string;
        };

        if (!plan) {
          return reply.status(400).send({ error: 'A valid plan is required.' });
        }

        const result = await workflowService.executePlan(plan, { id: userId }, projectId);

        const msg = '프로젝트 생성이 완료되었습니다! 파일 트리에서 결과를 확인하세요.';
        return reply.send({
          type: 'WORKFLOW_RESULT',
          payload: {
            ...result,
            summaryMessage: msg,
          },
        });
      } catch (error: any) {
        app.log.error(error, 'Error in workflow execution');
        return reply.status(500).send({
          error: 'Failed to execute workflow.',
          details: error.message,
        });
      }
    }
  );
}
