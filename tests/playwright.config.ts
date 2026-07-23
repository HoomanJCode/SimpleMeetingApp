import { defineConfig, devices } from '@playwright/test';
import path from 'path';

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
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use system Chrome instead of Playwright's bundled Chromium.
        // Required when the Playwright CDN is geo-restricted (403).
        channel: 'chrome',
      },
    },
  ],

  // Auto-start backend + frontend. Both bind to 127.0.0.1 to avoid
  // IPv4/IPv6 mismatches on Windows (Node 17+ resolves localhost → ::1).
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: path.resolve(__dirname, '../backend'),
      env: {
        ...process.env,
        ENABLE_TEST_ROUTES: '1',
        GOOGLE_CLIENT_ID: 'test-google-client-id',
        GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
        GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
        JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
        FRONTEND_URL: 'http://127.0.0.1:5173',
        HOST: '127.0.0.1',
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: path.resolve(__dirname, '../frontend'),
    },
  ],
});
