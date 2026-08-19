/**
 * Screenshot capture config — extends the main Playwright config (same
 * webServer entries, same env overlay) but only picks up the screenshot
 * spec, which deliberately lives OUTSIDE tests/e2e so `npm run test:e2e`
 * never runs it.
 *
 * Run from the tests/ directory:
 *   npx playwright test --config screenshots/playwright.config.ts
 */
import { defineConfig } from '@playwright/test';
import base from '../playwright.config';

export default defineConfig({
  ...base,
  testDir: '.',
  reporter: [['list']],
});
