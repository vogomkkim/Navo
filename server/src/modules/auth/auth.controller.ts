import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

// 컨트롤러는 서비스와 리포지토리를 주입받아 사용합니다.
// 실제 인스턴스 생성 및 주입은 server.ts나 DI 컨테이너에서 이루어집니다.
export const authController = (app: FastifyInstance) => {
  const authRepository = new AuthRepository();
  const authService = new AuthService(authRepository);

  app.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 입력값 검증은 zod 등을 사용하여 추후 추가
      const result = await authService.register(request.body as any);
      reply.status(201).send({ ok: true, user: result });
    }
  );

  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await authService.login(request.body as any);
    reply.send({ ok: true, ...result });
  });
};
