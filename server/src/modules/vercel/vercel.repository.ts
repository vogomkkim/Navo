import { db } from '../../db';
import { vercelIntegrations } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface VercelIntegrationData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  teamId?: string | null;
}

export class VercelRepository {
  /**
   * Vercel 통합 정보를 생성하거나 업데이트합니다.
   * @param data - 저장할 Vercel 통합 정보
   * @returns 저장된 정보
   */
  async upsertIntegration(data: VercelIntegrationData) {
    const result = await db
      .insert(vercelIntegrations)
      .values({
        userId: data.userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        teamId: data.teamId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: vercelIntegrations.userId,
        set: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          teamId: data.teamId,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  }
}
