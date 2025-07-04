import { defineConfig, devices } from '@playwright/test';
console.log('PLAYWRIGHT TESTS');
export default defineConfig({
  testDir: 'test/e2e',

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  use: {
    // Collect trace when retrying the failed test.
    trace: 'on-first-retry'
  },

  // Configure projects for major browsers.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
