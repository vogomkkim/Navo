import { FastifyInstance } from 'fastify';

import { ProjectsService } from './projects.service';

export function projectsController(app: FastifyInstance) {
  const projectsService = new ProjectsService(app);

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
    },
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
          userId,
        );
        reply.send({ nodes });
      } catch (error) {
        app.log.error(error, '프로젝트 VFS 노드 목록 조회 실패');
        reply
          .status(500)
          .send({ error: '프로젝트 VFS 노드 목록 조회에 실패했습니다.' });
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
          userId,
        );
        reply.send({ project });
      } catch (error) {
        app.log.error(error, '프로젝트 이름 변경 실패');
        reply.status(500).send({ error: '프로젝트 이름 변경에 실패했습니다.' });
      }
    },
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
    },
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
    },
  );
}
