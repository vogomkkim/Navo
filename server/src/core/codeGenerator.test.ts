import { describe, it, expect } from 'vitest';
import { addRouteToSource } from './codeGenerator';

describe('addRouteToSource', () => {
  it('should add a new route to a simple Fastify plugin with a default export function', () => {
    const sourceCode = `
import { FastifyInstance } from 'fastify';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users', async () => {
    return { users: [] };
  });
}
`;
    const newRouteCode = `fastify.post('/users', async () => { return { status: 'created' }; });`;

    const expectedCode = `
import { FastifyInstance } from 'fastify';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users', async () => {
    return { users: [] };
  });

  fastify.post('/users', async () => { return { status: 'created' }; });
}
`;

    const result = addRouteToSource(sourceCode, newRouteCode);
    // Normalize whitespace for comparison
    expect(result.replace(/\s/g, '')).toBe(expectedCode.replace(/\s/g, ''));
  });

  it('should preserve existing comments and formatting', () => {
    const sourceCode = `
import { FastifyInstance } from 'fastify';

/**
 * This is the main plugin for user routes.
 */
export default async function userRoutes(fastify: FastifyInstance) {
  // Get all users
  fastify.get('/users', async () => {
    return { users: [] };
  });
}
`;
    const newRouteCode = `fastify.post('/users', async () => { return { status: 'created' }; });`;

    const result = addRouteToSource(sourceCode, newRouteCode);

    // Check that the new code is present
    expect(result).toContain(`fastify.post('/users'`);
    // Check that the old code and comments are still there
    expect(result).toContain(`/**
 * This is the main plugin for user routes.
 */`);
    expect(result).toContain(`// Get all users`);
  });

  it('should throw an error for invalid new route code', () => {
    const sourceCode = `export default async function(fastify) {}`;
    const invalidRouteCode = `fastify.get('invalid syntax`;

    expect(() => addRouteToSource(sourceCode, invalidRouteCode)).toThrow(
      "The provided new route code is not valid JavaScript/TypeScript."
    );
  });

  it('should handle files with no default export by appending to the end', () => {
    const sourceCode = `
import { FastifyInstance } from 'fastify';

// No default export here
`;
    const newRouteCode = `console.log('fallback');`;
    const result = addRouteToSource(sourceCode, newRouteCode);
    expect(result.trim().endsWith(`console.log('fallback');`)).toBe(true);
  });
});
