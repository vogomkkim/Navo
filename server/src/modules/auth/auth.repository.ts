import { eq } from 'drizzle-orm';

import { db } from '@/db/db.instance';
import { organizations, users, usersToOrganizations } from '@/drizzle/schema';

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

  async createUserWithOrganization(newUserData: NewUser) {
    return db.transaction(async (tx) => {
      // 1. Create the user
      const insertedUsers = await tx
        .insert(users)
        .values(newUserData)
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          createdAt: users.createdAt,
        });
      const newUser = insertedUsers[0];
      if (!newUser) {
        tx.rollback();
        throw new Error('User creation failed within transaction.');
      }

      // 2. Create a personal organization for the user
      const insertedOrgs = await tx
        .insert(organizations)
        .values({
          name: `${newUser.name || newUser.email}'s Team`,
          ownerId: newUser.id,
        })
        .returning();
      const newOrg = insertedOrgs[0];
      if (!newOrg) {
        tx.rollback();
        throw new Error('Organization creation failed within transaction.');
      }

      // 3. Link the user to the organization
      await tx.insert(usersToOrganizations).values({
        userId: newUser.id,
        organizationId: newOrg.id,
      });

      return newUser;
    });
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
