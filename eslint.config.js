import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

// mimic CommonJS variables -- not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

export default tseslint.config(
  {
    // Global settings for all files
    plugins: {
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
    },
    extends: [...tseslint.configs.recommended, eslintPluginPrettierRecommended],
    rules: {
      'prettier/prettier': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-explicit-any': 'warn', // Changed to warn
      '@typescript-eslint/no-unused-vars': [
        'warn', // Changed to warn
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'linebreak-style': ['error', 'unix'],
      'import/no-cycle': ['error', { maxDepth: 5 }],
      'import/order': 'off',
    },
  },
  {
    // Server-specific settings
    files: ['server/**/*.ts', 'packages/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./server/tsconfig.json', './packages/shared/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./server/tsconfig.json', './packages/shared/tsconfig.json'],
        },
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '^\\.{1,2}/(lib|modules|db|config)(/.*)?$',
            '^@/modules/.*$',
          ],
        },
      ],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './server/src',
              from: './server/src/modules',
              message:
                'Cross-module import is not allowed. Use shared packages or lib for communication.',
            },
          ],
        },
      ],
    },
  },
  {
    // Frontend-specific settings (Next.js, React)
    files: ['frontend/**/*.ts', 'frontend/**/*.tsx'],
    plugins: {
      '@next/next': nextPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        project: ['./frontend/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './frontend/tsconfig.json',
        },
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    // Overrides for specific server files
    files: ['server/src/modules/**/*.ts'],
    rules: {
      'import/no-restricted-paths': 'off',
    },
  },
  {
    files: ['server/src/server.ts'],
    rules: {
      'import/no-restricted-paths': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    // Ignore patterns
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      'server/_backup/**',
      'eslint.config.js', // Ignore self
    ],
  },
);