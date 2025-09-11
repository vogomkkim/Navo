import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineRoute } from '../../core/routeFactory';
// import {
//   createUserSchema,
//   userIdParamsSchema,
//   userResponseSchema
// } from '../../../packages/shared/src/schemas/user.schema';

// Define schemas locally for now
const createUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const userIdParamsSchema = z.object({
  userId: z.string(),
});

const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

// Mock database - replace with actual service/repository calls
const users: { id: string; name: string; email: string }[] = [];

export default async function userRoutes(fastify: FastifyInstance) {

  // --- GET /api/users/:userId ---
  defineRoute(fastify, {
    method: 'GET',
    url: '/api/users/:userId',
    auth: 'required',
    schema: {
      summary: 'Get a single user by ID',
      tags: ['Users'],
      params: userIdParamsSchema,
      response: {
        200: userResponseSchema,
        404: z.object({ error: z.string() }),
      },
    },
    handler: async (req, reply) => {
      const { userId } = req.params as z.infer<typeof userIdParamsSchema>;
      const user = users.find(u => u.id === userId);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // No reply.send() needed here. Just return the data.
      // The factory will handle sending the response with a 200 status code.
      return { user };
    },
  });

  // --- POST /api/users ---
  defineRoute(fastify, {
    method: 'POST',
    url: '/api/users',
    auth: 'none', // Public endpoint
    schema: {
      summary: 'Create a new user',
      tags: ['Users'],
      body: createUserSchema,
      response: {
        201: userResponseSchema,
      },
    },
    handler: async (req) => {
      const { name, email } = req.body as z.infer<typeof createUserSchema>;

      const newUser = {
        id: randomUUID(),
        name,
        email,
      };
      users.push(newUser);

      // The factory will automatically send this with a 201 status code
      // because 201 is the success code defined in the schema.
      return { user: newUser };
    },
  });
}
