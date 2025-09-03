import { FastifyInstance } from 'fastify';
import { ComponentsService } from './components.service';
import {
  CreateComponentDefinitionData,
  UpdateComponentDefinitionData,
} from './components.types';

export function componentsController(app: FastifyInstance) {
  const componentsService = new ComponentsService(app);

  // List component definitions
  app.get(
    '/api/components/project/:projectId',
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

        const components = await componentsService.listComponentDefinitions(
          projectId,
          userId
        );
        reply.send({ components });
      } catch (error) {
        app.log.error(error, '컴포넌트 정의 목록 조회 실패');
        reply
          .status(500)
          .send({ error: '컴포넌트 정의 목록 조회에 실패했습니다.' });
      }
    }
  );

  // Get component definition by ID
  app.get(
    '/api/components/:id',
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
        const id = params.id as string;

        const component = await componentsService.getComponentDefinition(
          id,
          userId
        );
        reply.send({ component });
      } catch (error) {
        app.log.error(error, '컴포넌트 정의 조회 실패');
        reply.status(500).send({ error: '컴포넌트 정의 조회에 실패했습니다.' });
      }
    }
  );

  // Get component definition by name
  app.get(
    '/api/components/project/:projectId/name/:name',
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
        const name = params.name as string;

        const component = await componentsService.getComponentDefinitionByName(
          name,
          projectId,
          userId
        );
        reply.send({ component });
      } catch (error) {
        app.log.error(error, '이름별 컴포넌트 정의 조회 실패');
        reply
          .status(500)
          .send({ error: '이름별 컴포넌트 정의 조회에 실패했습니다.' });
      }
    }
  );

  // Create component definition
  app.post(
    '/api/components',
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

        const body = request.body as any;
        const componentData: CreateComponentDefinitionData = {
          name: body.name,
          displayName: body.displayName,
          description: body.description,
          category: body.category,
          propsSchema: body.propsSchema || {},
          renderTemplate: body.renderTemplate,
          cssStyles: body.cssStyles,
          projectId: body.projectId,
        };

        // Validation
        if (
          !componentData.name ||
          !componentData.displayName ||
          !componentData.category ||
          !componentData.renderTemplate ||
          !componentData.projectId
        ) {
          reply.status(400).send({ error: '필수 필드가 누락되었습니다.' });
          return;
        }

        const component = await componentsService.createComponentDefinition(
          componentData,
          userId
        );
        reply.status(201).send({ component });
      } catch (error) {
        app.log.error(error, '컴포넌트 정의 생성 실패');
        reply.status(500).send({ error: '컴포넌트 정의 생성에 실패했습니다.' });
      }
    }
  );

  // Update component definition
  app.patch(
    '/api/components/:id',
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
        const id = params.id as string;
        const body = request.body as any;

        const componentData: UpdateComponentDefinitionData = {};
        if (body.displayName !== undefined)
          componentData.displayName = body.displayName;
        if (body.description !== undefined)
          componentData.description = body.description;
        if (body.category !== undefined) componentData.category = body.category;
        if (body.propsSchema !== undefined)
          componentData.propsSchema = body.propsSchema;
        if (body.renderTemplate !== undefined)
          componentData.renderTemplate = body.renderTemplate;
        if (body.cssStyles !== undefined)
          componentData.cssStyles = body.cssStyles;
        if (body.isActive !== undefined) componentData.isActive = body.isActive;

        const component = await componentsService.updateComponentDefinition(
          id,
          componentData,
          userId
        );
        reply.send({ component });
      } catch (error) {
        app.log.error(error, '컴포넌트 정의 업데이트 실패');
        reply
          .status(500)
          .send({ error: '컴포넌트 정의 업데이트에 실패했습니다.' });
      }
    }
  );

  // Delete component definition
  app.delete(
    '/api/components/:id',
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
        const id = params.id as string;

        await componentsService.deleteComponentDefinition(id, userId);
        reply.send({ success: true });
      } catch (error) {
        app.log.error(error, '컴포넌트 정의 삭제 실패');
        reply.status(500).send({ error: '컴포넌트 정의 삭제에 실패했습니다.' });
      }
    }
  );

  // Seed component definitions
  app.post(
    '/api/components/project/:projectId/seed',
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
        const components = body.components || [];

        const seededComponents =
          await componentsService.seedComponentDefinitions(
            projectId,
            components,
            userId
          );
        reply.send({ components: seededComponents });
      } catch (error) {
        app.log.error(error, '컴포넌트 정의 시드 실패');
        reply.status(500).send({ error: '컴포넌트 정의 시드에 실패했습니다.' });
      }
    }
  );

  // Generate component from natural language
  app.post(
    '/api/components/project/:projectId/generate',
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
        const description = body.description;

        if (!description || typeof description !== 'string') {
          reply.status(400).send({ error: '컴포넌트 설명이 필요합니다.' });
          return;
        }

        const component =
          await componentsService.generateComponentFromNaturalLanguage(
            description,
            projectId,
            userId
          );
        reply.status(201).send({ component });
      } catch (error) {
        app.log.error(error, '자연어 컴포넌트 생성 실패');
        reply
          .status(500)
          .send({ error: '자연어 컴포넌트 생성에 실패했습니다.' });
      }
    }
  );
}
