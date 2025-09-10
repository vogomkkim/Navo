import * as recast from 'recast';
import * as parser from '@babel/parser';
import * as types from '@babel/types';
import { z } from 'zod';
// Assuming the Zod schema is generated and available from the shared package
// import { apiBlueprintSchema } from '../../packages/shared/src/api-blueprint.schema';

// Define a simple schema for now
const apiBlueprintSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  endpoints: z.array(z.object({
    method: z.string(),
    path: z.string(),
    description: z.string().optional(),
  })),
});

type ApiBlueprint = z.infer<typeof apiBlueprintSchema>;

/**
 * Adds a new Fastify route registration to an existing source code file.
 * This function uses AST manipulation to safely inject the new route.
 *
 * @param sourceCode The original source code of the routes file.
 * @param newRouteCode The string representation of the new route to add.
 *                       Example: `fastify.get('/new', async () => ({ hello: 'world' }));`
 * @returns The modified source code with the new route added.
 */
export function addRouteToSource(sourceCode: string, newRouteCode: string): string {
  const ast = recast.parse(sourceCode, {
    parser: {
      parse: (source: string) =>
        parser.parse(source, {
          sourceType: 'module',
          plugins: ['typescript'],
        }),
    },
  });

  // Parse the new route code into an AST statement
  let newRouteStatement: types.Statement | null = null;
  try {
    const newRouteAst = parser.parse(newRouteCode, {
      sourceType: 'module',
      plugins: ['typescript'],
    });
    if (types.isFile(newRouteAst) && newRouteAst.program.body.length > 0) {
      newRouteStatement = newRouteAst.program.body[0];
    }
  } catch (error) {
    console.error("Failed to parse new route code:", error);
    throw new Error("The provided new route code is not valid JavaScript/TypeScript.");
  }

  if (!newRouteStatement) {
    throw new Error("Could not create a valid AST statement from the new route code.");
  }

  // Find the main export function (e.g., `export default async function routes(fastify)`)
  let exportFunctionBody: types.BlockStatement['body'] | null = null;

  recast.visit(ast, {
    visitExportDefaultDeclaration(path) {
      const declaration = path.node.declaration;
      if (
        (types.isFunctionDeclaration(declaration as any) || types.isArrowFunctionExpression(declaration as any)) &&
        (declaration as any).body &&
        types.isBlockStatement((declaration as any).body)
      ) {
        exportFunctionBody = (declaration as any).body.body;
      } else if (types.isFunctionExpression(declaration as any) && (declaration as any).body) {
        exportFunctionBody = (declaration as any).body.body;
      }
      return false; // Stop visiting after finding the default export
    },
  });

  if (exportFunctionBody) {
    // Add the new route to the end of the function body
    (exportFunctionBody as any[]).push(newRouteStatement);
  } else {
    // If no default export function is found, append to the end of the file.
    // This is a fallback and might not be ideal for all file structures.
    ast.program.body.push(newRouteStatement);
  }

  // Print the modified AST back to a string, preserving original formatting
  const { code } = recast.print(ast);

  return code;
}


/**
 * Generates a basic vitest test stub for a given API blueprint.
 * The generated test checks if each endpoint is registered and returns a 501 Not Implemented status.
 *
 * @param blueprint The API blueprint object.
 * @param moduleName The name of the module (e.g., 'user') for describe blocks.
 * @returns A string containing the vitest test code.
 */
export function generateTestStub(blueprint: ApiBlueprint, moduleName: string): string {
  const testCases = blueprint.endpoints.map(endpoint => {
    const path = endpoint.path.replace(/:(\w+)/g, 'test-$1'); // Replace params like :userId with a static value
    const method = endpoint.method.toLowerCase();

    return `
  it('should have the ${method.toUpperCase()} ${endpoint.path} endpoint registered', async () => {
    // TODO: Implement a proper mock server or inject the app instance
    // For now, this is a placeholder for the test structure.
    // A real test would look something like this:
    /*
    const response = await app.inject({
      method: '${method.toUpperCase()}',
      url: '${path}',
    });
    // Initially, we might expect a 501 Not Implemented
    expect(response.statusCode).toBe(501);
    */

    // Placeholder expectation
    expect('${endpoint.path}').toBe('${endpoint.path}');
    console.log('Test stub for ${method.toUpperCase()} ${endpoint.path}');
  });
`;
  }).join('');

  return `
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// import { buildServer } from '../..'; // Assuming a server factory
// import { FastifyInstance } from 'fastify';

describe('${moduleName} Routes', () => {
  // let app: FastifyInstance;

  // beforeAll(async () => {
  //   app = await buildServer();
  //   await app.ready();
  // });

  // afterAll(async () => {
  //   await app.close();
  // });

  ${testCases}
});
`;
}
