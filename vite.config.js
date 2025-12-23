import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Important for Electron - use relative paths
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
