import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { readFileSync } from 'fs';
import { beasties } from 'vite-plugin-beasties';

const rootPkg = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
  plugins: [
    react(),
    svgr(),
    beasties({
      options: {
        pruneSource: false,
        inlineFonts: true,
        compress: true,
        noscriptFallback: true
      }
    })
  ],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version)
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@gifit/shared': path.resolve(__dirname, '../shared/src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
      '~': path.resolve(__dirname, './src')
    }
  }
});
