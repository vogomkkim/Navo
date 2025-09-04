import { FastifyInstance } from 'fastify';
import { OrchestratorService } from '@/core/orchestrator/orchestrator.service';
import { ProjectsService } from './projects.service';

export function projectsController(app: FastifyInstance) {
  const projectsService = new ProjectsService(app);
  const orchestratorService = new OrchestratorService(app);

  // --- Chat Endpoints ---

  app.get(
    '/api/projects/:projectId/messages',
    { preHandler: [app.authenticateToken] },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const { cursor, limit = 20 } = request.query as { cursor?: string; limit?: number };
        const userId = (request as any).userId;

        const messages = await projectsService.getMessages(projectId, userId, { cursor, limit });
        reply.send(messages);
      } catch (error) {
        app.log.error(error, '메시지 조회 실패');
        reply.status(500).send({ error: '메시지 조회에 실패했습니다.' });
      }
    }
  );

  app.post(
    '/api/projects/:projectId/messages',
    { preHandler: [app.authenticateToken] },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const { prompt, chatHistory } = request.body as { prompt: string; chatHistory: any[] };
        const userId = (request as any).userId;

        if (!prompt) {
          return reply.status(400).send({ error: 'Prompt is required.' });
        }
        
        // 1. Save user's message to DB
        await projectsService.createMessage(projectId, userId, {
          role: 'user',
          content: prompt,
        });

        // 2. Get AI response from orchestrator
        const result = await orchestratorService.handleRequest(prompt, { id: userId }, chatHistory || []);

        // 3. Save AI's response to DB
        const aiRole = result.type === 'WORKFLOW_RESULT' ? 'DevOps Engineer' : 'Strategic Planner';
        const aiContent = result.type === 'WORKFLOW_RESULT' ? result.payload.summaryMessage : result.payload.message;
        
        await projectsService.createMessage(projectId, userId, {
          role: aiRole,
          content: aiContent,
          payload: result.payload,
        });
        
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

  // List projects
  app.get(
    '/api/projects',
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const projects = await projectsService.listProjects(userId);
        reply.send({ projects });
      } catch (error) {
        app.log.error(error, '프로젝트 목록 조회 실패');
        reply.status(500).send({ error: '프로젝트 목록 조회에 실패했습니다.' });
      }
    }
  );

  // List project VFS nodes
  app.get(
    '/api/projects/:projectId/vfs',
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;
        const query = request.query as any;
        const parentId = (query.parentId as string) || null;

        const nodes = await projectsService.listProjectVfsNodes(
          projectId,
          parentId,
          userId
        );
        reply.send({ nodes });
      } catch (error) {
        app.log.error(error, '프로젝트 VFS 노드 목록 조회 실패');
        reply
          .status(500)
          .send({ error: '프로젝트 VFS 노드 목록 조회에 실패했습니다.' });
      }
    }
  );

  // Get a single VFS node by ID
  app.get(
    '/api/projects/:projectId/vfs/:nodeId',
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const { projectId, nodeId } = params;

        const node = await projectsService.getVfsNode(
          nodeId,
          projectId,
          userId,
        );

        if (!node) {
          return reply.status(404).send({ error: '파일 또는 디렉토리를 찾을 수 없습니다.' });
        }

        reply.send({ node });
      } catch (error) {
        app.log.error(error, 'VFS 노드 조회 실패');
        reply.status(500).send({ error: 'VFS 노드 조회에 실패했습니다.' });
      }
    },
  );

  // Update a VFS node's content
  app.patch(
    '/api/projects/:projectId/vfs/:nodeId',
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const { projectId, nodeId } = params;
        const { content } = request.body as { content: string };

        if (typeof content !== 'string') {
          return reply.status(400).send({ error: 'Content must be a string.' });
        }

        const updatedNode = await projectsService.updateVfsNodeContent(
          nodeId,
          projectId,
          userId,
          content,
        );

        if (!updatedNode) {
          return reply.status(404).send({ error: '파일을 찾을 수 없습니다.' });
        }

        reply.send({ node: updatedNode });
      } catch (error) {
        app.log.error(error, 'VFS 노드 내용 업데이트 실패');
        reply.status(500).send({ error: 'VFS 노드 내용 업데이트에 실패했습니다.' });
      }
    },
  );

  // Rename project
  app.patch(
    '/api/projects/:projectId',
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;
        const body = request.body as any;
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
          reply.status(400).send({
            error: '유효하지 않은 이름입니다. 최소 2자 이상 입력해주세요.',
          });
          return;
        }

        const project = await projectsService.renameProject(
          projectId,
          name,
          userId
        );
        reply.send({ project });
      } catch (error) {
        app.log.error(error, '프로젝트 이름 변경 실패');
        reply.status(500).send({ error: '프로젝트 이름 변경에 실패했습니다.' });
      }
    }
  );

  // Delete project
  app.delete(
    '/api/projects/:projectId',
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;

        await projectsService.deleteProject(projectId, userId);
        reply.send({ success: true });
      } catch (error) {
        app.log.error(error, '프로젝트 삭제 실패');
        reply.status(500).send({ error: '프로젝트 삭제에 실패했습니다.' });
      }
    }
  );

  // Rollback project
  app.post(
    '/api/projects/:projectId/rollback',
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;

        const result = await projectsService.rollbackProject(projectId, userId);
        reply.send({ success: true, result });
      } catch (error) {
        app.log.error(error, '프로젝트 롤백 실패');
        reply.status(500).send({ error: '프로젝트 롤백에 실패했습니다.' });
      }
    }
  );
}
