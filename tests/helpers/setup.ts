import { test as base, expect } from '@playwright/test';
import { resetDb } from './api';

/**
 * Custom test fixture used by every E2E spec. Automatically resets the
 * backend database before each spec so tests run in isolation regardless
 * of execution order or parallel workers.
 *
 * Import path: `import { test, expect } from '../helpers/setup';`
 */
export const test = base;

test.beforeEach(async () => {
  await resetDb();
});

export { expect };
