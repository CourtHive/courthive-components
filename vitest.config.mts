/// <reference types="vitest/config" />
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite';
import path from 'path';

// Two projects, run separately:
//  - `unit` (`pnpm test`): the src/**/*.test.ts suites, in node (or happy-dom, per file). No browser.
//  - `storybook` (`pnpm test:stories`): every story's play function, run by Storybook's own Vitest
//    integration in headless Chromium. It replaced @storybook/test-runner, which failed every story
//    under Storybook 10 (CA, 2026-10-10). Needs `pnpm exec playwright install chromium` once.
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.stories.*', 'node_modules/**']
        }
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(__dirname, '.storybook') })],
        test: {
          name: 'storybook',
          // Play functions drive the page through `src/stories/helpers/trustedUser.ts`: every action is a
          // round trip to Playwright, not an in-page event. A story that loops over every preset (e.g.
          // compositionConsistencyControls, ~110 actions) takes ~5s alone and passed the 15s browser-mode
          // default under a full parallel run. 30s keeps headroom without letting a refused click hang long.
          testTimeout: 30_000,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
