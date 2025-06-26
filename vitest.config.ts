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
    setupFiles: './src/setupTests.ts'
  }
});
