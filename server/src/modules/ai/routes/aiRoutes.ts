import { FastifyInstance } from 'fastify';
import { authenticateToken } from '../auth/auth.js';
import {
  handleMultiAgentChat,
  handleVirtualPreview,
  handleProjectRecovery,
  getProjectStructure,
} from '../handlers/aiHandlers.js';
import { handleSimpleChat } from '../handlers/simpleChatHandler.js';
import { renderProjectToHTML, renderPageToHTML } from '../services/render.js';
import { and, eq } from 'drizzle-orm';
import { projects } from '../db/schema.js';
import { db } from '../db/db.js';

export default async function aiRoutes(fastify: FastifyInstance) {
  // AI 멀티 에이전트 채팅 (기존)
  fastify.post(
    '/ai/chat',
    { preHandler: [authenticateToken] },
    handleMultiAgentChat
  );

  // 새로운 간단한 채팅 (의도 기반 에이전트)
  fastify.post(
    '/ai/simple-chat',
    { preHandler: [authenticateToken] },
    handleSimpleChat
  );

  // AI 제안 생성
  fastify.post(
    '/ai/suggest',
    { preHandler: [authenticateToken] },
    async (request, reply) => {
      try {
        // TODO: Implement AI suggestion generation
        reply.send({ message: 'AI suggestion endpoint' });
      } catch (error) {
        reply.status(500).send({ error: 'AI suggestion failed' });
      }
    }
  );

  // 가상 파일 미리보기
  fastify.get(
    '/preview/:pageId/*',
    { preHandler: [authenticateToken] },
    handleVirtualPreview
  );

  // 프로젝트 복구 (이어서 완성하기)
  fastify.post(
    '/ai/recover-project',
    { preHandler: [authenticateToken] },
    handleProjectRecovery
  );

  // 프로젝트 구조 가져오기
  fastify.get(
    '/ai/project-structure/:projectId',
    { preHandler: [authenticateToken] },
    async (request, reply) => {
      try {
        const { projectId } = request.params as any;
        const userId = request.userId;

        // 프로젝트 소유권 확인
        if (!userId) {
          reply.status(401).send({ error: 'Unauthorized' });
          return;
        }

        const project = await db.query.projects.findFirst({
          where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
        });

        if (!project) {
          reply.status(404).send({ error: 'Project not found' });
          return;
        }

        // 프로젝트 구조 가져오기
        const projectStructure = await getProjectStructure(projectId);

        reply.send(projectStructure);
      } catch (error) {
        console.error('Error getting project structure:', error);
        reply.status(500).send({ error: 'Failed to get project structure' });
      }
    }
  );

  // 동적 사이트 렌더링 (인증 없이 접근 가능)
  fastify.get('/site/:projectId', async (request, reply) => {
    try {
      const { projectId } = request.params as any;

      // 프로젝트 구조 가져오기
      const project = await getProjectStructure(projectId);
      if (!project) {
        reply.status(404).send('Project not found');
        return;
      }

      // HTML 렌더링
      const html = await renderProjectToHTML(project);

      reply.type('text/html').send(html);
    } catch (error) {
      console.error('Error rendering site:', error);
      reply.status(500).send('Internal server error');
    }
  });

  // 프리뷰 도메인 라우팅: /preview-domain/:previewId(/:path*)
  // MVP: previewId == projectId로 매핑. 추후 별도 토큰 테이블로 확장 가능
  fastify.get('/preview-domain/:previewId', async (request, reply) => {
    try {
      const { previewId } = request.params as any;
      const project = await getProjectStructure(previewId);
      if (!project) {
        reply.status(404).send('Not found');
        return;
      }
      const html = await renderPageToHTML(project, '/', `/p/${previewId}/`);
      reply.type('text/html').send(html);
    } catch (error) {
      console.error('Error preview root:', error);
      reply.status(500).send('Internal server error');
    }
  });

  fastify.get('/preview-domain/:previewId/*', async (request, reply) => {
    try {
      const { previewId, '*': pathSplat } = request.params as any;
      const project = await getProjectStructure(previewId);
      if (!project) {
        reply.status(404).send('Not found');
        return;
      }
      const pagePath = `/${pathSplat || ''}`;
      const html = await renderPageToHTML(project, pagePath, `/p/${previewId}/`);
      reply.type('text/html').send(html);
    } catch (error) {
      console.error('Error preview path:', error);
      reply.status(500).send('Internal server error');
    }
  });
}
