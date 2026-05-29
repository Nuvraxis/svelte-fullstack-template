import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      // TS handles undef checks; eslint's no-undef misfires on TS types.
      'no-undef': 'off',
      // Allow unused args that start with _ (common SvelteKit load/handle pattern).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
      ],
      // Aspirational Svelte 5 migrations we haven't adopted:
      //  - `resolve()` wraps every href/goto for typed routes — we use plain string paths everywhere.
      //  - URLSearchParams in $derived is intentional: we sync URL state, not reactive Sets/Maps.
      'svelte/no-navigation-without-resolve': 'off',
      'svelte/prefer-svelte-reactivity': 'off'
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig
      }
    }
  },
  {
    ignores: [
      '.svelte-kit/',
      '.vercel/',
      'build/',
      'dist/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'tests/e2e/.auth/',
      'src/lib/types/database.types.ts'
    ]
  }
];
