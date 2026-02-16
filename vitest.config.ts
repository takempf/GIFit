import { defineConfig } from 'vitest/config';
import path from 'path';
import svgrPlugin from 'vite-plugin-svgr';
import { readFileSync } from 'fs';

const rootPkg = JSON.parse(
  readFileSync(path.resolve(__dirname, './package.json'), 'utf-8')
) as { version: string };

export default defineConfig({
  plugins: [svgrPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './packages/shared/src'),
      '@gifit/shared': path.resolve(__dirname, './packages/shared/src')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './packages/shared/src/setupTests.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      'test/e2e/**' // Exclude Playwright E2E tests
    ]
  }
});
