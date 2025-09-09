import { FastifyInstance, FastifyReply, FastifyRequest, RouteOptions } from 'fastify';
import { ZodType, z } from 'zod';
import { User } from '@prisma/client'; // Assuming you have User type from Prisma

// Define a custom request type that includes the authenticated user
export interface AuthenticatedRequest extends FastifyRequest {
  user?: User; // User is optional for public routes
}

// Define the structure for our route schemas
interface RouteSchema {
  summary?: string;
  description?: string;
  tags?: string[];
  params?: ZodType;
  querystring?: ZodType;
  body?: ZodType;
  response: {
    [statusCode: number]: ZodType;
  };
}

// Define the handler function type
type RouteHandler = (
  req: AuthenticatedRequest,
  reply: FastifyReply,
) => Promise<any>;

// The Route Factory Function
export function defineRoute(
  fastify: FastifyInstance,
  options: {
    method: RouteOptions['method'];
    url: string;
    auth: 'required' | 'optional' | 'none';
    schema: RouteSchema;
    handler: RouteHandler;
  },
) {
  fastify.route({
    method: options.method,
    url: options.url,
    schema: {
      summary: options.schema.summary,
      description: options.schema.description,
      tags: options.schema.tags,
      params: options.schema.params ? z.object(options.schema.params.shape) : undefined,
      querystring: options.schema.querystring ? z.object(options.schema.querystring.shape) : undefined,
      body: options.schema.body ? z.object(options.schema.body.shape) : undefined,
      response: Object.entries(options.schema.response).reduce(
        (acc, [code, schema]) => {
          acc[code] = z.object(schema.shape);
          return acc;
        },
        {} as Record<string, any>,
      ),
    },
    preHandler: async (req: AuthenticatedRequest, reply) => {
      if (options.auth === 'required' || options.auth === 'optional') {
        try {
          // This will verify the JWT and attach the user to the request
          await req.jwtVerify();
        } catch (err) {
          if (options.auth === 'required') {
            fastify.log.warn(`Auth failed for ${req.method} ${req.url}`);
            return reply.status(401).send({ error: 'Unauthorized' });
          }
          // For 'optional' auth, we just ignore the error and proceed without a user
        }
      }
    },
    handler: async (req: AuthenticatedRequest, reply) => {
      try {
        // The handler only contains business logic
        const result = await options.handler(req, reply);

        // If the handler has already sent a response, do nothing.
        if (reply.sent) {
          return;
        }
        
        // Determine the success status code from the schema, default to 200
        const successCode = Object.keys(options.schema.response).find(code => code.startsWith('2')) || '200';
        
        return reply.status(parseInt(successCode, 10)).send(result);

      } catch (error) {
        fastify.log.error(error, `Error in ${options.method} ${options.url}`);
        
        // Centralized error handling
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation failed',
            issues: error.errors,
          });
        }
        
        // You can add more specific error handling here (e.g., Prisma errors)
        
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  });
}
