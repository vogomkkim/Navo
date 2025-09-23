import config from '../../../config';
import { encrypt } from '../../lib/crypto';
import { VercelRepository } from './vercel.repository';

interface VercelTokenResponse {
  token_type: string;
  access_token: string;
  installation_id: string;
  user_id: string;
  team_id?: string | null;
  refresh_token: string;
  expires_in: number;
}

class VercelService {
  constructor(private readonly vercelRepository: VercelRepository) {}

  /**
   * Vercel API로부터 Access Token을 요청하고 DB에 저장합니다.
   * @param code - Vercel 인증 콜백에서 받은 임시 코드
   * @param userId - 현재 로그인한 사용자의 ID
   */
  async exchangeCodeForToken(code: string, userId: string): Promise<void> {
    const response = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.vercel.clientId,
        client_secret: config.vercel.clientSecret,
        code: code,
        redirect_uri: config.vercel.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Failed to get access token from Vercel: ${response.status}`, errorBody);
      throw new Error('Failed to get access token from Vercel.');
    }

    const data: VercelTokenResponse = await response.json();

    // 토큰 암호화
    const encryptedAccessToken = encrypt(data.access_token);
    const encryptedRefreshToken = encrypt(data.refresh_token);

    // DB에 저장
    await this.vercelRepository.upsertIntegration({
      userId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      teamId: data.team_id,
    });
  }
}

export { VercelService };