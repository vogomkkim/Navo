// server/src/scripts/run-code-generator.ts
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

// Use relative paths to import modules within the same package
import { addRouteToSource, generateTestStub } from '../core/codeGenerator';
import { getSafeAbsolutePath } from '../core/pathUtils';
// Avoid cross-package import to keep tsconfig root boundaries intact
const apiBlueprintSchema = z.object({
  blueprintType: z.literal('API_BLUEPRINT_V1').optional(),
  endpoints: z.array(z.object({
    path: z.string().regex(/^\//),
    method: z.enum(['GET', 'POST', 'PATCH', 'DELETE']),
    description: z.string(),
    request: z.object({
      params: z.record(z.object({ type: z.string(), description: z.string() })).optional(),
      body: z.record(z.object({ type: z.string(), description: z.string() })).optional(),
    }).optional(),
    response: z.record(z.object({
      description: z.string(),
      body: z.record(z.object({ type: z.string(), description: z.string() })).optional(),
    }))
  })).min(1)
});

// Use shared schema for validation

async function main() {
  console.log('🚀 Starting Code Generator Demonstration...');

  try {
    // --- 1. Read and Validate Blueprint ---
    const blueprintPath = path.resolve(process.cwd(), 'packages/shared/schemas/user-api.blueprint.json');
    const blueprintJSON = JSON.parse(await fs.readFile(blueprintPath, 'utf-8'));
    const blueprint = apiBlueprintSchema.parse(blueprintJSON);
    console.log('✅ [1/5] Blueprint validated successfully.');

    // --- 2. Define the new route to be added ---
    // This would be dynamically generated based on the blueprint in a real scenario
    const newRouteCode = `
  defineRoute(fastify, {
    method: 'DELETE',
    url: '/api/users/:userId',
    auth: 'required',
    schema: {
      summary: 'Delete a user by ID',
      tags: ['Users'],
      params: userIdParamsSchema,
      response: {
        204: z.object({}).describe('User deleted successfully'),
      },
    },
    handler: async (req, reply) => {
      // In a real implementation, you would call a service to delete the user.
      console.log('Simulating deletion of user: ' + (req.params as any).userId);
      return reply.status(204).send();
    },
  });`;
    console.log('✅ [2/5] New route code snippet prepared.');

    // --- 3. Read existing routes file and add the new route via AST ---
    const routesFilePathRelative = 'server/src/modules/user/user.routes.ts';
    const routesFilePathAbsolute = getSafeAbsolutePath(routesFilePathRelative);
    const originalRoutesCode = await fs.readFile(routesFilePathAbsolute, 'utf-8');

    const updatedRoutesCode = addRouteToSource(originalRoutesCode, newRouteCode);
    console.log('✅ [3/5] New route safely added to existing code via AST.');

    // --- 4. Write the updated code back to the file ---
    await fs.writeFile(routesFilePathAbsolute, updatedRoutesCode);
    console.log(`✅ [4/5] File updated: ${routesFilePathRelative}`);
    console.log('    -> NOTE: A new DELETE endpoint has been added!');

    // --- 5. Generate and write the test stub ---
    const testStubCode = generateTestStub(blueprint as any, 'User');
    const testFilePathRelative = 'server/src/modules/user/user.routes.test.ts';
    const testFilePathAbsolute = getSafeAbsolutePath(testFilePathRelative);

    await fs.writeFile(testFilePathAbsolute, testStubCode);
    console.log(`✅ [5/5] Test stub written to: ${testFilePathRelative}`);

    console.log('\n🎉 Demonstration finished successfully!');
    console.log('Check the modified files to see the result.');

  } catch (error) {
    console.error('\n❌ Demonstration failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
