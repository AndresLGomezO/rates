import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Shared ESLint base configuration for the monorepo
 * Individual packages/apps should extend this configuration
 * Note: Type-checked rules should be configured in individual configs
 * where the tsconfig.json is properly referenced
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/build',
      '**/node_modules',
      '**/.pnpm-store',
      '**/coverage',
      '**/*.config.js',
      '**/*.config.ts',
      '**/vite.config.ts',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    rules: {
      // TypeScript best practices (non-type-checked rules)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
