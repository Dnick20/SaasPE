import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry flaky tests once even in local runs
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  timeout: 30000, // 30 second timeout per test
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000, // 10 second timeout for actions
  },

  projects: [
    // Auth tests without pre-authenticated session
    {
      name: 'chromium-auth',
      testMatch: '**/auth.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-auth',
      testMatch: '**/auth.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-auth',
      testMatch: '**/auth.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
    // All other tests with pre-authenticated session
    {
      name: 'chromium',
      testIgnore: '**/auth.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
    },
    {
      name: 'firefox',
      testIgnore: '**/auth.spec.ts',
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/user.json',
      },
    },
    {
      name: 'webkit',
      testIgnore: '**/auth.spec.ts',
      use: {
        ...devices['Desktop Safari'],
        storageState: '.auth/user.json',
      },
    },
  ],

  // Disabled when running against Docker - set BASE_URL env var to use external server
  ...(process.env.BASE_URL ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
    },
  }),
});
