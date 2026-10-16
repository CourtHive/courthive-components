import { defineConfig } from 'vite';

// Additive ESM feature entries. The main build keeps its historical root ESM/UMD and CSS cascade.
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: { courts: 'src/components/courts/index.ts', 'segmented-bar': 'src/components/segmentedBar/index.ts' },
      formats: ['es'],
      fileName: (_format, entry) => `${entry}.mjs`,
      cssFileName: 'features'
    }
  }
});
