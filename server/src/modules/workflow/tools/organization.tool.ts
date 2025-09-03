/**
 * @file Defines tools for managing organizations (tenants).
 */

import { Tool, ExecutionContext } from '../types';
import { db } from '@/modules/db';
import { organizations, users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

async function getOrCreateDummyUser(): Promise<string> {
  const dummyEmail = 'testuser@example.com';
  const existingUsers = await db.select().from(users).where(eq(users.email, dummyEmail)).limit(1);
  let user = existingUsers[0];

  if (user) {
    return user.id;
  }

  const newUser = await db.insert(users).values({
    email: dummyEmail,
    name: 'Test User',
    // In a real app, password should be hashed.
    password: 'password123',
  }).returning();

  return newUser[0].id;
}

export const createOrganizationTool: Tool = {
  name: 'create_organization',
  description: 'Creates a new organization (tenant) for a user. If ownerId is a placeholder, it creates a dummy user.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: "The name of the organization." },
      ownerId: { type: 'string', description: "The UUID of the user who owns this organization. Can be a placeholder." },
    },
    required: ['name', 'ownerId'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      ownerId: { type: 'string' },
    },
  },
  async execute(context: ExecutionContext, input: { name: string; ownerId: string }): Promise<any> {
    console.log(`[create_organization] Creating organization: ${input.name}`);
    try {
      let ownerId = input.ownerId;
      // If the ownerId is a placeholder, create a dummy user.
      if (ownerId === 'c1b2a3d4-e5f6-7890-1234-567890abcdef') {
        ownerId = await getOrCreateDummyUser();
        console.log(`[create_organization] Created dummy user with id: ${ownerId}`);
      }

      const newOrg = await db.insert(organizations).values({
        name: input.name,
        ownerId: ownerId,
      }).returning();

      return newOrg[0];
    } catch (error) {
      console.error(`[create_organization] Failed to create organization:`, error);
      throw error;
    }
  },
};
