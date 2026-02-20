import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['eslint.config.js', 'vitest.config.ts', 'playwright.config.ts'],
  project: ['*.{js,ts}'],
  workspaces: {
    'packages/shared': {
      entry: ['src/index.ts', 'src/setupTests.ts'],
      project: ['src/**/*.{ts,tsx}'],
      ignore: ['**/*.test.{ts,tsx}']
    },
    'packages/web': {
      entry: ['src/main.tsx', 'vite.config.ts', 'index.html'],
      project: ['src/**/*.{ts,tsx}', 'vite.config.ts']
    },
    'packages/extension': {
      entry: [
        'entrypoints/content/index.tsx',
        'entrypoints/popup/index.tsx',
        'entrypoints/main-world.ts',
        'wxt.config.ts',
        'web-ext.config.ts'
      ],
      project: [
        'entrypoints/**/*.{ts,tsx}',
        'wxt.config.ts',
        'web-ext.config.ts'
      ],
      ignoreDependencies: ['#imports']
    }
  },
  ignore: ['**/*.d.ts', '**/dist/**', '**/dist-website/**', 'src/**'],

  ignoreDependencies: ['@types/node']
};

export default config;
