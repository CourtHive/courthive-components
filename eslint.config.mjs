import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'storybook-static/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      sonarjs: sonarjs,
      storybook: storybook,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-unused-expressions': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-all-duplicated-branches': 'warn',
      'sonarjs/no-collapsible-if': 'warn',
      'sonarjs/no-collection-size-mischeck': 'warn',
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/no-duplicated-branches': 'warn',
      'sonarjs/no-empty-collection': 'warn',
      'sonarjs/no-extra-arguments': 'warn',
      'sonarjs/no-gratuitous-expressions': 'warn',
      'sonarjs/no-identical-expressions': 'warn',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-ignored-return': 'off',
      'sonarjs/no-nested-template-literals': 'warn',
      'sonarjs/no-redundant-boolean': 'warn',
      'sonarjs/no-redundant-jump': 'warn',
      'sonarjs/no-small-switch': 'warn',
      'sonarjs/no-unused-collection': 'warn',
      'sonarjs/prefer-object-literal': 'warn',
      'sonarjs/prefer-single-boolean-return': 'warn',
      '@typescript-eslint/no-useless-escape': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-prototype-builtins': 'off',
    },
  },
  {
    files: ['**/*.stories.ts', '**/*.stories.tsx', '**/*.stories.js', '**/*.stories.jsx'],
    plugins: {
      storybook: storybook,
    },
    rules: {
      ...storybook.configs.recommended.rules,
    },
  },
];
