/// <reference types="vitest/config" />
import { name } from './package.json';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

// Vite config for build only (unit tests use vitest.config.mts)
export default defineConfig({
  server: {
    host: '0.0.0.0'
  },
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**'],
      outDir: 'dist',
      insertTypesEntry: true,
      rollupTypes: true, // Bundle all .d.ts files into one
    })
  ],
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