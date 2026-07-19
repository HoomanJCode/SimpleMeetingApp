import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // workers: 1 is required because tests/ helpers/setup.ts runs resetDb()
  // in beforeEach, which DELETEs all rows from the shared SQLite DB. With
  // >1 worker, two tests would race: one worker's reset would wipe another
  // worker's fixture mid-test, producing flakes that hide real bugs.
  // Speed loss is acceptable for an E2E suite this size; CI can revisit
  // with per-worker DBs if the suite grows. fullyParallel is also false
  // so tests within a single spec file don't race either.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['list']],
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start both backend and frontend before tests.
  // ENABLE_TEST_ROUTES=1 is required so the dev-only /api/test/* endpoints
  // (login + reset) are mounted for seeding and DB isolation.
  webServer: [
    {
      command: 'cd ../backend && npm run dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      cwd: __dirname,
      env: {
        ...process.env,
        ENABLE_TEST_ROUTES: '1',
      },
    },
    {
      command: 'cd ../frontend && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      cwd: __dirname,
    },
  ],
});
