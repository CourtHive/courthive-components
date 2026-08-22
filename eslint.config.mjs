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
        NodeListOf: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      sonarjs: sonarjs,
      storybook: storybook,
    },
    rules: {
      ...tseslint.configs.recommended.rules,

      // ── CourtHive coding standards, machine-enforced ────────────────────
      // Prose in Mentat/standards/coding-standards.md drifts, because lint, types AND prettier all
      // pass while the code violates it.
      //
      // ⚠️ ONE key, both selectors. A JS object literal cannot carry `no-restricted-syntax` twice —
      // the later wins and the earlier vanishes silently. `chore/dataset-lint-rule` and the
      // deep-copy ban were authored independently and git merged them as two separate additions
      // WITHOUT a conflict, producing exactly that duplicate. Lint stayed green, because the
      // violations each rule targets had already been fixed. Add a selector here; never a second key.
      //
      // Severity is the stricter of the two ('error'): both are hard standards.
      'no-restricted-syntax': [
        'error',
        {
          // DOM data attributes are read via `.dataset`, never `.getAttribute`.
          selector: "CallExpression[callee.property.name='getAttribute'][arguments.0.value=/^data-/]",
          message: 'Use .dataset.propName instead of .getAttribute("data-*") — Mentat coding standards.',
        },
        {
          // `JSON.parse(JSON.stringify(x))` as a deep copy silently drops `undefined`, functions,
          // `Date`/`Map`/`Set` and throws on cycles. Mirrors factory and competition-factory-server.
          selector:
            "CallExpression[callee.object.name='JSON'][callee.property.name='parse'] > CallExpression[callee.object.name='JSON'][callee.property.name='stringify']",
          message:
            'Use structuredClone() to deep-copy — JSON.parse(JSON.stringify(x)) drops undefined/functions/Date/Map/Set and throws on cycles. For tournamentRecords use tools.makeDeepCopy, which carries factory extension semantics.',
        },
      ],
      'no-unused-expressions': 'off',
      'no-useless-assignment': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 30],
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
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
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
