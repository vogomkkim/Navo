import { db } from '@/db/db.instance';
import { users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NewUser } from './auth.types';

export class AuthRepository {
  async findUserByEmail(email: string) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0];
  }

  async createUser(newUserData: NewUser) {
    const inserted = await db.insert(users).values(newUserData).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    });
    return inserted[0];
  }
}
