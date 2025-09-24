import { db } from "@/db";
import { integrations } from "@/schema";
import { eq, and } from "drizzle-orm";

export interface VercelIntegrationData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  teamId?: string | null;
}

export class VercelRepository {
  private readonly SERVICE_TYPE = "vercel";

  /**
   * Vercel 통합 정보를 생성하거나 업데이트합니다.
   * @param data - 저장할 Vercel 통합 정보
   * @returns 저장된 정보
   */
  async upsertIntegration(data: VercelIntegrationData) {
    const credentials = {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      team_id: data.teamId,
    };

    const metadata = {
      connected_at: new Date().toISOString(),
    };

    const result = await db
      .insert(integrations)
      .values({
        userId: data.userId,
        serviceType: this.SERVICE_TYPE,
        credentials,
        metadata,
        isActive: true,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [integrations.userId, integrations.serviceType],
        set: {
          credentials,
          metadata,
          isActive: true,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();

    return result[0];
  }

  /**
   * 사용자 ID로 Vercel 통합 정보를 찾습니다.
   * @param userId - 사용자 ID
   * @returns Vercel 통합 정보 또는 undefined
   */
  async findIntegrationByUserId(userId: string) {
    const result = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.userId, userId),
        eq(integrations.serviceType, this.SERVICE_TYPE),
        eq(integrations.isActive, true)
      ),
    });
    return result;
  }

  /**
   * 사용자의 Vercel 통합을 비활성화합니다.
   * @param userId - 사용자 ID
   */
  async disconnectIntegration(userId: string) {
    await db
      .update(integrations)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.serviceType, this.SERVICE_TYPE)
        )
      );
  }
}
