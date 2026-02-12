import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/entrypoints/content/index.tsx',
    'src/entrypoints/popup/index.tsx',
    'src/entrypoints/main-world.ts',
    'wxt.config.ts',
    'vitest.config.ts',
    'playwright.config.ts',
    'web-ext.config.ts',
    'eslint.config.js'
  ],
  project: ['src/**/*.{ts,tsx}'],
  ignore: ['**/*.d.ts'],
  ignoreDependencies: ['@types/node'] // Often implicit
};

export default config;
