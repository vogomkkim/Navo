import { config } from "../../config";
import { encrypt, decrypt } from "../../lib/crypto";
import { VercelRepository } from "./vercel.repository";

interface VercelTokenResponse {
  token_type: string;
  access_token: string;
  installation_id: string;
  user_id: string;
  team_id?: string | null;
  refresh_token: string;
  expires_in: number;
}

interface VercelCredentials {
  access_token: string;
  refresh_token: string;
  team_id?: string | null;
}

class VercelService {
  constructor(private readonly vercelRepository: VercelRepository) {}

  /**
   * Vercel API로부터 Access Token을 요청하고 DB에 저장합니다.
   * @param code - Vercel 인증 콜백에서 받은 임시 코드
   * @param userId - 현재 로그인한 사용자의 ID
   */
  async exchangeCodeForToken(code: string, userId: string): Promise<void> {
    const response = await fetch(
      "https://api.vercel.com/v2/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: config.vercel.clientId,
          client_secret: config.vercel.clientSecret,
          code: code,
          redirect_uri: config.vercel.redirectUri,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Failed to get access token from Vercel: ${response.status}`,
        errorBody
      );
      throw new Error("Failed to get access token from Vercel.");
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

  /**
   * 사용자의 Vercel 연동 상태를 확인합니다.
   * @param userId - 확인할 사용자의 ID
   * @returns 연동 상태 정보
   */
  async getIntegrationStatus(userId: string) {
    const integration = await this.vercelRepository.findIntegrationByUserId(
      userId
    );

    if (!integration) {
      return { isConnected: false };
    }

    return {
      isConnected: true,
      connectedAt: integration.createdAt,
      teamId: (integration.credentials as VercelCredentials)?.team_id,
    };
  }

  /**
   * 사용자의 Vercel 연동을 해제합니다.
   * @param userId - 연동을 해제할 사용자의 ID
   */
  async disconnectIntegration(userId: string): Promise<void> {
    await this.vercelRepository.disconnectIntegration(userId);
  }

  /**
   * 사용자의 암호화된 Vercel 토큰을 가져옵니다.
   * @param userId - 사용자 ID
   * @returns 암호화된 토큰 정보
   */
  async getTokens(userId: string) {
    const integration = await this.vercelRepository.findIntegrationByUserId(
      userId
    );

    if (!integration) {
      return null;
    }

    return {
      accessToken: (integration.credentials as VercelCredentials)?.access_token,
      refreshToken: (integration.credentials as VercelCredentials)
        ?.refresh_token,
      teamId: (integration.credentials as VercelCredentials)?.team_id,
    };
  }

  /**
   * 사용자의 복호화된 Vercel 토큰을 가져옵니다.
   * @param userId - 사용자 ID
   * @returns 복호화된 토큰 정보
   */
  async getDecryptedTokens(userId: string) {
    const tokens = await this.getTokens(userId);

    if (!tokens) {
      return null;
    }

    return {
      accessToken: decrypt(tokens.accessToken),
      refreshToken: decrypt(tokens.refreshToken),
      teamId: tokens.teamId,
    };
  }
}

export { VercelService };
