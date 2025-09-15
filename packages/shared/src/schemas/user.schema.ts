import { z } from "zod";

// Base user properties, useful for responses
export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

// Schema for creating a new user (omits 'id')
export const createUserSchema = userSchema.omit({ id: true });

// Schema for URL parameters that include a userId
export const userIdParamsSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// Example of a full response schema
export const userResponseSchema = z.object({
  user: userSchema,
});

export const usersResponseSchema = z.object({
  users: z.array(userSchema),
});
