import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 5173);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    // 1. Setup project: seeds the test DB and creates auth state files for each role.
    { name: 'setup', testMatch: /global\.setup\.ts/ },

    // 2. Desktop Chromium — full suite.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      dependencies: ['setup'],
      testIgnore: /(\.mobile|\.a11y)\.spec\.ts/
    },

    // 3. Mobile iPhone 14 — responsive suite.
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
      dependencies: ['setup'],
      testMatch: /\.mobile\.spec\.ts/
    },

    // 4. Accessibility — axe-core sweep.
    {
      name: 'accessibility',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testMatch: /\.a11y\.spec\.ts/
    }
  ],

  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
