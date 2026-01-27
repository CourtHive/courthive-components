import type { StorybookConfig } from '@storybook/html-vite';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": ["@storybook/addon-docs", "@chromatic-com/storybook"],
  "framework": {
    "name": "@storybook/html-vite",
    "options": {}
  },
  viteFinal: async (config) => {
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