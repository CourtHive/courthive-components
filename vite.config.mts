import { name } from './package.json';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    host: '0.0.0.0'
  },
  test: {
    globals: true,
    environment: 'jsdom'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: (format) => `${name}.${format}.js`,
      name
    },
    rollupOptions: {
      external: [],
      output: { globals: {} }
    }
  }
});
