import { FastifyInstance } from 'fastify';

import { PagesService } from './pages.service';
import { CreatePageData, UpdatePageData } from './pages.types';

export function pagesController(app: FastifyInstance) {
  const pagesService = new PagesService(app);

  // List pages by project
  app.get(
    '/api/pages/project/:projectId',
    {
      preHandler: [app.authenticateToken],
    },
    async (request: any, reply) => {
      try {
        const { userId } = request.user as { userId: string };
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;

        const pages = await pagesService.listPages(projectId, userId);
        reply.send({ pages });
      } catch (error) {
        app.log.error(error, '페이지 목록 조회 실패');
        reply.status(500).send({ error: '페이지 목록 조회에 실패했습니다.' });
      }
    },
  );

  // Get page by ID
  app.get(
    '/api/pages/:pageId',
    {
      preHandler: [app.authenticateToken],
    },
    async (request: any, reply) => {
      try {
        const { userId } = request.user as { userId: string };
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const pageId = params.pageId as string;

        const page = await pagesService.getPage(pageId, userId);
        reply.send({ page });
      } catch (error) {
        app.log.error(error, '페이지 조회 실패');
        reply.status(500).send({ error: '페이지 조회에 실패했습니다.' });
      }
    },
  );

  // Get page by path
  app.get(
    '/api/pages/project/:projectId/path/*',
    {
      preHandler: [app.authenticateToken],
    },
    async (request: any, reply) => {
      try {
        const { userId } = request.user as { userId: string };
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;
        const path = (request as any).url.split('/path/')[1] || '/';

        const page = await pagesService.getPageByPath(projectId, path, userId);
        reply.send({ page });
      } catch (error) {
        app.log.error(error, '경로별 페이지 조회 실패');
        reply.status(500).send({ error: '경로별 페이지 조회에 실패했습니다.' });
      }
    },
  );

  // Create page
  app.post(
    '/api/pages',
    {
      preHandler: [app.authenticateToken],
    },
    async (request: any, reply) => {
      try {
        const { userId } = request.user as { userId: string };
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const body = request.body as any;
        const pageData: CreatePageData = {
          path: body.path,
          name: body.name,
          description: body.description,
          layoutJson: body.layoutJson || {},
          projectId: body.projectId,
        };

        // Validation
        if (!pageData.path || !pageData.name || !pageData.projectId) {
          reply.status(400).send({ error: '필수 필드가 누락되었습니다.' });
          return;
        }

        const page = await pagesService.createPage(pageData, userId);
        reply.status(201).send({ page });
      } catch (error) {
        app.log.error(error, '페이지 생성 실패');
        reply.status(500).send({ error: '페이지 생성에 실패했습니다.' });
      }
    },
  );

  // Update page
  app.patch(
    '/api/pages/:pageId',
    {
      preHandler: [app.authenticateToken],
    },
    async (request: any, reply) => {
      try {
        const { userId } = request.user as { userId: string };
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const pageId = params.pageId as string;
        const body = request.body as any;

        const pageData: UpdatePageData = {};
        if (body.name !== undefined) pageData.name = body.name;
        if (body.description !== undefined)
          pageData.description = body.description;
        if (body.layoutJson !== undefined)
          pageData.layoutJson = body.layoutJson;
        if (body.isPublished !== undefined)
          pageData.isPublished = body.isPublished;

        const page = await pagesService.updatePage(pageId, pageData, userId);
        reply.send({ page });
      } catch (error) {
        app.log.error(error, '페이지 업데이트 실패');
        reply.status(500).send({ error: '페이지 업데이트에 실패했습니다.' });
      }
    },
  );

  // Delete page
  app.delete(
    '/api/pages/:pageId',
    {
      preHandler: [app.authenticateToken],
    },
    async (request: any, reply) => {
      try {
        const { userId } = request.user as { userId: string };
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const pageId = params.pageId as string;

        await pagesService.deletePage(pageId, userId);
        reply.send({ success: true });
      } catch (error) {
        app.log.error(error, '페이지 삭제 실패');
        reply.status(500).send({ error: '페이지 삭제에 실패했습니다.' });
      }
    },
  );

  // Publish page
  app.post(
    '/api/pages/:pageId/publish',
    {
      preHandler: [app.authenticateToken],
    },
    async (request: any, reply) => {
      try {
        const { userId } = request.user as { userId: string };
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const pageId = params.pageId as string;

        const page = await pagesService.publishPage(pageId, userId);
        reply.send({ page });
      } catch (error) {
        app.log.error(error, '페이지 발행 실패');
        reply.status(500).send({ error: '페이지 발행에 실패했습니다.' });
      }
    },
  );

  // Unpublish page
  app.post(
    '/api/pages/:pageId/unpublish',
    {
      preHandler: [app.authenticateToken],
    },
    async (request: any, reply) => {
      try {
        const { userId } = request.user as { userId: string };
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const pageId = params.pageId as string;

        const page = await pagesService.unpublishPage(pageId, userId);
        reply.send({ page });
      } catch (error) {
        app.log.error(error, '페이지 발행 해제 실패');
        reply.status(500).send({ error: '페이지 발행 해제에 실패했습니다.' });
      }
    },
  );
}
