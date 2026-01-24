import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.js';

let tailwindcssPlugin = null;
try {
  tailwindcssPlugin = (await import('eslint-plugin-tailwindcss')).default;
} catch {
  // Optional: keep lint working even if eslint-plugin-tailwindcss isn't installed yet.
}

/**
 * ESLint configuration for the React app
 * Extends the shared base configuration and adds React-specific rules
 */
export default tseslint.config(
  ...baseConfig,
  { ignores: ['dist', 'vite.config.ts'] },
  {
    extends: [...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      ...(tailwindcssPlugin ? { tailwindcss: tailwindcssPlugin } : {}),
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Type-checked rules
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'off',
      ...(tailwindcssPlugin
        ? {
            // Tailwind CSS class ordering
            'tailwindcss/classnames-order': 'warn',
            'tailwindcss/no-custom-classname': 'off', // Allow custom classes like ds-card-light
            'tailwindcss/no-contradicting-classname': 'off',
          }
        : {}),
    },
  }
);
