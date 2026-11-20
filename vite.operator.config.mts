import { peerDependencies } from './package.json';
import { defineConfig } from 'vite';

// Independent CSS output: adding operator widgets must not grow the existing features.css consumer budget.
export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      external: (id) => Object.keys(peerDependencies).some((peer) => id === peer || id.startsWith(peer + '/'))
    },
    lib: {
      entry: 'src/components/operator/index.ts',
      formats: ['es'],
      fileName: () => 'operator.mjs',
      cssFileName: 'operator'
    }
  }
});
