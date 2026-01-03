import type { StorybookConfig } from '@storybook/html-vite';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": ["@storybook/addon-docs", "@storybook/addon-vitest"],
  "framework": {
    "name": "@storybook/html-vite",
    "options": {}
  }
};
export default config;