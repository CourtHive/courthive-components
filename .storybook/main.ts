import type { StorybookConfig } from '@storybook/html-vite';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs', '@chromatic-com/storybook', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/html-vite',
    options: {}
  },
  viteFinal: async (config) => {
    if (!config.optimizeDeps) config.optimizeDeps = {};
    config.optimizeDeps.include = [...(config.optimizeDeps.include || []), 'timepicker-ui'];

    if (!config.server) config.server = {};
    if (!config.server.fs) config.server.fs = {};
    // Worktrees link node_modules to the canonical checkout outside their parent.
    config.server.fs.allow = ['..', realpathSync(resolve(import.meta.dirname, '../node_modules'))];

    // Set base path for GitHub Pages deployment
    if (process.env.NODE_ENV === 'production') {
      config.base = '/courthive-components/';

      // Aggressive code-splitting elimination for GitHub Pages
      if (!config.build) config.build = {};
      if (!config.build.rollupOptions) config.build.rollupOptions = {};

      config.build.rollupOptions.output = {
        manualChunks: () => 'everything.js', // Force all code into single bundle
        inlineDynamicImports: false // Can't inline with multiple entries
      };

      config.build.chunkSizeWarningLimit = 5000;
    }
    return config;
  }
};
export default config;
