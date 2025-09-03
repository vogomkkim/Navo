import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { EventsService } from './events.service';

export default async function eventRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  const eventsService = new EventsService(fastify);

  // Unified events endpoint
  fastify.post(
    '/events',
    { preHandler: [fastify.authenticateToken] },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const { events: eventsArray, ...otherFields } = request.body as any;

        if (eventsArray && Array.isArray(eventsArray)) {
          if (eventsArray.length === 0) {
            reply.status(400).send({ error: '이벤트 배열이 비어있습니다.' });
            return;
          }

          for (const event of eventsArray) {
            if (!event.type) {
              reply
                .status(400)
                .send({ error: '모든 이벤트에 타입이 필요합니다.' });
              return;
            }
          }

          const count = await eventsService.storeUserEvents(
            eventsArray,
            userId
          );
          reply.send({ success: true, count });
          return;
        }

        reply.status(400).send({
          error: '잘못된 이벤트 형식입니다. 이벤트 배열이 필요합니다.',
        });
      } catch (error) {
        fastify.log.error(error, '이벤트 처리 실패');
        reply.status(500).send({ error: '이벤트 처리에 실패했습니다.' });
      }
    }
  );

  // Error logging endpoint
  fastify.post(
    '/events/log-error',
    { preHandler: [fastify.authenticateToken] },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const errorData = request.body as any;

        if (errorData.message || errorData.filename || errorData.stack) {
          await eventsService.storeErrorEvent(errorData, userId);
          reply.send({ success: true, logged: true });
          return;
        }

        reply.status(400).send({
          error:
            '잘못된 에러 형식입니다. message, filename, stack 중 하나는 필요합니다.',
        });
      } catch (error) {
        fastify.log.error(error, '에러 로깅 실패');
        reply.status(500).send({ error: '에러 로깅에 실패했습니다.' });
      }
    }
  );

  // Get user events
  fastify.get(
    '/events/user',
    { preHandler: [fastify.authenticateToken] },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const userEvents = await eventsService.getUserEvents(userId);
        reply.send({ success: true, events: userEvents });
      } catch (error) {
        fastify.log.error(error, '사용자 이벤트 조회 실패');
        reply.status(500).send({ error: '사용자 이벤트 조회에 실패했습니다.' });
      }
    }
  );

  // Get project events
  fastify.get(
    '/events/project/:projectId',
    { preHandler: [fastify.authenticateToken] },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: '사용자 인증이 필요합니다.' });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;

        const projectEvents = await eventsService.getProjectEvents(projectId);
        reply.send({ success: true, events: projectEvents });
      } catch (error) {
        fastify.log.error(error, '프로젝트 이벤트 조회 실패');
        reply
          .status(500)
          .send({ error: '프로젝트 이벤트 조회에 실패했습니다.' });
      }
    }
  );
}
