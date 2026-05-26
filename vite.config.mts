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
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**', 'src/stories/**'],
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
      // Mark Tiptap external so each consumer (TMX, AMS console) supplies
      // its own copy — keeps the Editor class instance canonical across
      // the host app (pnpm hoists matching ^3.22.2 to one copy in the
      // workspace).
      external: [
        'tods-competition-factory',
        '@tiptap/core',
        '@tiptap/starter-kit',
        '@tiptap/extension-color',
        '@tiptap/extension-highlight',
        '@tiptap/extension-text-align',
        '@tiptap/extension-text-style',
        '@tiptap/extension-youtube'
      ],
      output: {
        globals: {
          'tods-competition-factory': 'competitionFactory',
          '@tiptap/core': 'TiptapCore',
          '@tiptap/starter-kit': 'TiptapStarterKit',
          '@tiptap/extension-color': 'TiptapExtensionColor',
          '@tiptap/extension-highlight': 'TiptapExtensionHighlight',
          '@tiptap/extension-text-align': 'TiptapExtensionTextAlign',
          '@tiptap/extension-text-style': 'TiptapExtensionTextStyle',
          '@tiptap/extension-youtube': 'TiptapExtensionYoutube'
        }
      }
    }
  }
});