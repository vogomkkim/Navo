// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const normalizeRules = (rules) => {
  const out = {};
  if (!rules) return out;
  for (const [key, val] of Object.entries(rules)) {
    if (typeof val === 'string') {
      out[key] = val === 'off' ? 0 : val === 'warn' ? 1 : 2;
    } else {
      out[key] = val;
    }
  }
  return out;
};

export default tseslint.config(
  {
    // Global ignores
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**', '**/out/**', 'server/_backup/**', '**/drizzle/schema.d.ts', 'frontend/next-env.d.ts'],
  },

  // Base configurations
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // Frontend-specific settings (Next.js, React)
    files: ['frontend/**/*.ts', 'frontend/**/*.tsx'],
    plugins: {
      '@next/next': nextPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...normalizeRules(nextPlugin.configs?.recommended?.rules),
      ...normalizeRules(nextPlugin.configs?.['core-web-vitals']?.rules),
      ...normalizeRules(reactPlugin.configs?.recommended?.rules),
      ...normalizeRules(reactHooksPlugin.configs?.recommended?.rules),
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  {
    files: ['server/**/*.ts', 'packages/**/*.ts'],
    plugins: {
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
