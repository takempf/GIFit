/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; // Assuming this project uses Vite (WXT uses Vite)

// https://vitejs.dev/config/
// https://vitest.dev/config/
export default defineConfig({
  plugins: [react()], // Use the same React plugin as your app if possible
  test: {
    globals: true, // Allow global APIs like describe, it, expect
    environment: 'jsdom', // Or 'happy-dom' for a faster alternative
    setupFiles: './vitest.setup.ts', // Optional: for global test setup
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      all: true, // Include all files in coverage report, not just tested ones
      include: ['src/**/*.{ts,tsx}'], // Specify files to include in coverage
      exclude: [
        // Specify files/patterns to exclude
        'src/entrypoints/**', // Entrypoints might be hard to test in unit/integration tests
        'src/**/index.ts', // Often just re-exports
        'src/**/*.d.ts',
        'src/**/*.config.{js,ts}',
        'src/**/main.{js,ts,tsx}', // Typically main app setup
        'src/**/vite-env.d.ts',
        'src/vite-env.d.ts', // if it exists at root of src
        'src/env.d.ts', // if it exists
        '.wxt/**',
        'node_modules/**',
        'dist/**'
        // Add any other patterns to exclude, like stories, types, constants if not testable
      ]
    },
    alias: {
      // Replicate aliases from tsconfig.json or vite.config.js if any
      '@/': new URL('./src/', import.meta.url).pathname
    }
  }
});
