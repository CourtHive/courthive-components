import { peerDependencies } from './package.json';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      external: (id) => Object.keys(peerDependencies).some((peer) => id === peer || id.startsWith(peer + '/'))
    },
    lib: {
      entry: 'src/components/scoring/index.ts',
      formats: ['es'],
      fileName: () => 'score-entry.mjs',
      cssFileName: 'score-entry'
    }
  }
});
