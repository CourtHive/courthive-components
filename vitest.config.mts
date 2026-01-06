/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import path from 'path';

// Separate config for unit tests only (not Storybook)
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.stories.*', 'node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
