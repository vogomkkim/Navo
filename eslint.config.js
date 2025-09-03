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
    extends: [...tseslint.configs.recommended, eslintPluginPrettierRecommended],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./server/tsconfig.json'],
      },
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'linebreak-style': ['error', 'unix'],
      // Enforce alias usage instead of relative imports to top-level dirs
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '^\\.{1,2}/(lib|modules|db|config)(/.*)?$',
            '^@/modules/.*$',
          ],
        },
      ],
      // Enforce module boundaries (disabled inside modules via override below)
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
      // Prevent cyclical dependencies
      'import/no-cycle': ['error', { maxDepth: 5 }],
      // Enforce import order
      'import/order': 'off',
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './server/tsconfig.json',
        },
      },
    },
  },
  {
    // Ignore build output, node_modules, legacy backups and legacy ai core
    ignores: [
      '../dist/**',
      '../node_modules/**',
      'server/_backup/**',
    ],
  },
  {
    files: ['server/src/modules/**/*.ts'],
    rules: {
      // Allow intra-module relative imports; cross-module still blocked by no-restricted-imports on aliases/relative up-level
      'import/no-restricted-paths': 'off',
    },
  }
);
