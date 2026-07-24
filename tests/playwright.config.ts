import { defineConfig, devices } from '@playwright/test';
import path from 'path';
// IMPORTANT: this `require` works because tests/tsconfig.json declares
// `module: commonjs`. If that ever changes to ESM, this file will silently
// load TEST_ENV as undefined and tests will run without their env overlay —
// update both files together if you swap module systems.
const TEST_ENV = require('../scripts/test-env.cjs').all;

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
  // Test env is sourced from scripts/test-env.cjs (single source of truth).
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: path.resolve(__dirname, '../backend'),
      env: {
        ...process.env,
        ...TEST_ENV,
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
