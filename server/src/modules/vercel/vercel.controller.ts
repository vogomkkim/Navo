import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import config from '../../../config';
import { VercelService } from './vercel.service';
import { VercelRepository } from './vercel.repository';

export const vercelController = (app: FastifyInstance) => {
  const vercelRepository = new VercelRepository();
  const vercelService = new VercelService(vercelRepository);

  /**
   * 사용자를 Vercel 권한 동의 페이지로 리디렉션합니다.
   * 이 라우트는 인증이 필요합니다.
   */
  app.get(
    '/auth',
    { preHandler: [app.authenticateToken] },
    (req: FastifyRequest, reply: FastifyReply) => {
      const vercelAuthUrl = new URL('https://vercel.com/oauth/authorize');
      vercelAuthUrl.searchParams.set('client_id', config.vercel.clientId);
      vercelAuthUrl.searchParams.set('redirect_uri', config.vercel.redirectUri);
      vercelAuthUrl.searchParams.set('scope', 'offline_access');
      // CSRF 방지를 위해 state에 userId 등을 포함한 JWT를 사용할 수 있습니다.
      // 지금은 간단하게 구현합니다.
      vercelAuthUrl.searchParams.set('state', (req.user as any).userId);

      reply.redirect(vercelAuthUrl.toString());
    }
  );

  /**
   * Vercel로부터의 콜백을 처리하고 access token을 교환합니다.
   * 이 라우트는 인증이 필요 없습니다.
   */
  app.get('/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code) {
      return reply.status(400).send({ error: 'Authorization code is missing.' });
    }
    if (!state) {
      return reply.status(400).send({ error: 'State is missing. CSRF attempt?' });
    }

    // state 값을 통해 어떤 사용자의 요청이었는지 확인합니다.
    const userId = state;

    try {
      await vercelService.exchangeCodeForToken(code, userId);

      // TODO: 성공 후 사용자를 프론트엔드의 '연동 성공' 페이지로 리디렉션해야 합니다.
      reply.status(200).send({ message: 'Vercel authentication successful!' });
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      reply.status(500).send({ error: 'Failed to authenticate with Vercel.' });
    }
  });
};
