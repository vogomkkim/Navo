import { eq } from 'drizzle-orm';

import { db } from '@/modules/db';
import { users } from '@/schema';

export class DbRepository {
  // 예시: 사용자 관련 데이터 접근 메서드
  async findUserById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  // 다른 일반적인 DB 접근 메서드들을 여기에 추가할 수 있습니다.
}
