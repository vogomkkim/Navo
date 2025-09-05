import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest will run in a Node.js environment for this package
    environment: 'node',
    // Ensure TypeScript files are processed correctly
    globals: true,
  },
});
