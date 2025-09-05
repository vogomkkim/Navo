// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
  {
    // Global ignores
    ignores: [
        '**/dist/**',
        '**/node_modules/**',
        '**/.next/**',
        '**/out/**',
        'server/_backup/**',
        '**/drizzle/schema.d.ts',
        'frontend/next-env.d.ts',
    ],
  },
  
  // Base configurations
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // Frontend-specific settings (Next.js, React)
    files: ['frontend/**/*.ts', 'frontend/**/*.tsx'],
    plugins: {
      '@next/next': nextPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'prettier': prettierPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
    settings: {
        react: {
            version: 'detect',
        },
    }
  },

  {
    // Server-specific settings
    files: ['server/**/*.ts', 'packages/**/*.ts'],
    plugins: {
        'prettier': prettierPlugin,
    },
    rules: {
        'prettier/prettier': 'error',
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
    }
  }
);
