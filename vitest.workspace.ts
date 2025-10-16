import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared',
  'server',
  'frontend',
]);
