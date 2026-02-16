import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import Critters from 'critters';

const rootPkg = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

const crittersPlugin = () => ({
  name: 'critters-plugin',
  async writeBundle(options: any) {
    const outDir = options.dir || 'dist';
    const indexHtmlPath = path.resolve(outDir, 'index.html');

    try {
      const html = readFileSync(indexHtmlPath, 'utf-8');
      const critters = new Critters({
        path: outDir,
        preload: 'media',
        external: false, // Ensure we don't try to inline external fonts causing potential timeouts if network is blocked
        inlineFonts: true,
        compress: true
      });

      const inlinedHtml = await critters.process(html);
      writeFileSync(indexHtmlPath, inlinedHtml);
      console.log('✨ Critical CSS inlined successfully');
    } catch (e) {
      console.error('Error inlining critical CSS:', e);
    }
  }
});

export default defineConfig({
  plugins: [react(), svgr(), crittersPlugin()],
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
