import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';
import importPlugin from 'eslint-plugin-import';

// mimic CommonJS variables -- not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

export default tseslint.config(
  {
    files: ['**/*.ts'],
    plugins: {
      import: importPlugin,
    },
    extends: [
      ...tseslint.configs.recommended,
      eslintPluginPrettierRecommended,
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['../config/tsconfig.json'],
      },
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'linebreak-style': ['error', 'unix'],
      // Enforce module boundaries
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './server/src/modules',
              from: './server/src/modules',
              message: 'Cross-module import is not allowed. Use shared packages or lib for communication.',
            },
          ],
        },
      ],
      // Prevent cyclical dependencies
      'import/no-cycle': ['error', { maxDepth: 5 }],
      // Enforce import order
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: '../config/tsconfig.json',
        },
      },
    },
  },
  {
    // Ignore build output and node_modules
    ignores: ['../dist/**', '../node_modules/**'],
  }
);
