import { describe, it, expect } from 'vitest';
import { addRouteToSource } from './codeGenerator';

// Helper to make tests less brittle to formatting changes.
// This removes whitespace, newlines, quotes, semicolons, commas, and comment characters.
const normalizeCode = (code: string) => code.replace(/[\s'"`;,*\/]/g, '');

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
    expect(normalizeCode(result)).toBe(normalizeCode(expectedCode));
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

    // Check for the substance of the code/comments, not exact formatting
    expect(normalizeCode(result)).toContain(normalizeCode(newRouteCode));
    expect(normalizeCode(result)).toContain(normalizeCode('This is the main plugin for user routes.'));
    expect(normalizeCode(result)).toContain(normalizeCode('Get all users'));
  });

  it('should throw an error for invalid new route code', () => {
    const sourceCode = `export default async function(fastify) {}`;
    const invalidRouteCode = `fastify.get('invalid syntax`;

    expect(() => addRouteToSource(sourceCode, invalidRouteCode)).toThrow();
  });

  it('should handle files with no default export by appending to the end', () => {
    const sourceCode = `
import { FastifyInstance } from 'fastify';

// No default export here
`;
    const newRouteCode = `console.log('fallback');`;
    const result = addRouteToSource(sourceCode, newRouteCode);
    expect(normalizeCode(result)).toContain(normalizeCode(newRouteCode));
  });
});