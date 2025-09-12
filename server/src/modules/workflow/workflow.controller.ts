/**
 * @file Defines the API endpoint for the workflow engine.
 */
import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { OrchestratorService } from '@/core/orchestrator/orchestrator.service';
import { WorkflowService } from './workflow.service';

// A simple in-memory connection manager
export const connectionManager = {
  connections: new Map<string, Set<WebSocket>>(),

  add(projectId: string, socket: WebSocket) {
    if (!this.connections.has(projectId)) {
      this.connections.set(projectId, new Set());
    }
    this.connections.get(projectId)!.add(socket);
    console.log(`[WebSocket] Connection added to project ${projectId}. Total: ${this.connections.get(projectId)!.size}`);
  },

  remove(projectId: string, socket: WebSocket) {
    const projectConnections = this.connections.get(projectId);
    if (projectConnections) {
      projectConnections.delete(socket);
      console.log(`[WebSocket] Connection removed from project ${projectId}. Total: ${projectConnections.size}`);
      if (projectConnections.size === 0) {
        this.connections.delete(projectId);
      }
    }
  },

  broadcast(projectId: string, message: any) {
    const projectConnections = this.connections.get(projectId);
    if (projectConnections) {
      const stringifiedMessage = JSON.stringify(message);
      console.log(`[WebSocket] Broadcasting to project ${projectId}: ${stringifiedMessage}`);
      projectConnections.forEach(socket => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(stringifiedMessage);
        }
      });
    }
  },
};


export function workflowController(app: FastifyInstance) {
  const orchestratorService = new OrchestratorService(app);
  const workflowService = new WorkflowService(app);

  // WebSocket route for real-time progress
  app.get('/api/ws/projects/:projectId', { websocket: true }, (connection, req) => {
    const { projectId } = req.params as { projectId: string };
    
    connectionManager.add(projectId, connection.socket);

    connection.socket.on('message', message => {
      // For now, we only broadcast from server to client.
      // This could be used for client->server communication if needed.
      console.log(`[WebSocket] Received message from client for project ${projectId}: ${message.toString()}`);
    });

    connection.socket.on('close', () => {
      connectionManager.remove(projectId, connection.socket);
    });
    
    connection.socket.on('error', (error) => {
        console.error(`[WebSocket] Error on project ${projectId}:`, error);
        connectionManager.remove(projectId, connection.socket);
    });
  });

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

        const result = await orchestratorService.handleRequest(
          prompt,
          { id: userId },
          chatHistory || [],
          projectId,
        );

        return reply.send(result);
      } catch (error: any) {
        app.log.error(error, 'Error in orchestrator service');
        return reply.status(500).send({
          error: 'Failed to handle request.',
          details: error.message,
        });
      }
    },
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

        const result = await workflowService.executePlan(
          plan,
          { id: userId },
          projectId,
        );

        return reply.send({
          type: 'WORKFLOW_RESULT',
          payload: {
            ...result,
            summaryMessage: '프로젝트 생성이 완료되었습니다! 파일 트리에서 결과를 확인하세요.',
          },
        });
      } catch (error: any) {
        app.log.error(error, 'Error in workflow execution');
        return reply.status(500).send({
          error: 'Failed to execute workflow.',
          details: error.message,
        });
      }
    },
  );
}