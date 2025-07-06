import { defineConfig } from 'vitest/config';
import path from 'path';
import svgrPlugin from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [svgrPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
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
