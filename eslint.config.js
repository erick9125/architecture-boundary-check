import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'examples/**',
      'scripts/**',
      'tests/fixtures/**',
      'node_modules/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['eslint.config.js', 'vitest.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
);
