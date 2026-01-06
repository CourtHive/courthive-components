/// <reference types="vitest/config" />
import { name } from './package.json';
import { defineConfig } from 'vite';
import path from 'path';

// Vite config for build only (unit tests use vitest.config.mts)
export default defineConfig({
  server: {
    host: '0.0.0.0'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: format => `${name}.${format}.js`,
      name
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  }
});