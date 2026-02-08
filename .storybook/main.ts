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
    // Configure optimizations for EventCalendar (Svelte-based) dependencies
    if (!config.optimizeDeps) config.optimizeDeps = {};
    config.optimizeDeps.include = [
      ...(config.optimizeDeps.include || []),
      '@event-calendar/core',
      'timepicker-ui',
    ];
    
    // Force exclude Svelte from optimization to avoid issues
    config.optimizeDeps.exclude = [
      ...(config.optimizeDeps.exclude || []),
      'svelte',
    ];
    
    // Ensure proper module resolution for ESM
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.alias) config.resolve.alias = {};
    
    // Handle .svelte.js files properly
    if (!config.resolve.extensions) {
      config.resolve.extensions = ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.svelte'];
    }
    
    // Configure server to handle dependencies
    if (!config.server) config.server = {};
    if (!config.server.fs) config.server.fs = {};
    config.server.fs.allow = ['..'];
    
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