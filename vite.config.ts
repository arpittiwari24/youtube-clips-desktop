import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: path.join(__dirname, 'src/main/index.ts'),
        onstart(args) {
          args.startup();
        },
        vite: {
          build: {
            outDir: path.join(__dirname, 'dist/main'),
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'src/main/preload.ts'),
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: path.join(__dirname, 'dist/main'),
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src/renderer'),
    },
  },
  root: path.join(__dirname, 'src/renderer'),
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
});
