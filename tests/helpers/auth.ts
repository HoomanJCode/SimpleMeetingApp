import type { Page } from '@playwright/test';
import { BACKEND_URL, FRONTEND_URL } from './api';
import { testUsers, type TestUser, type TestUserLike } from '../fixtures/users';

function resolveUser(like: TestUserLike): TestUser {
  return typeof like === 'string' ? testUsers[like] : like;
}

export function getTestUser(like: TestUserLike): TestUser {
  return resolveUser(like);
}

/**
 * Logs the given user in via the UI flow (without going through Google).
 *
 * Accepts either a preset key (`'alice'`, `'bob'`, `'charlie'`) or a raw
 * `TestUser` object.
 *
 * Process:
 *   1. Hit the dev-only /api/test/login endpoint to receive real
 *      access + refresh tokens via the same code path as OAuth.
 *   2. Navigate to /auth/callback with those tokens in the URL so the
 *      app's AuthCallbackPage runs identically to a real OAuth return.
 *   3. Wait for AuthContext to pick up the user and the header to
 *      display their name.
 */
export async function loginAs(page: Page, like: TestUserLike): Promise<TestUser> {
  const user = resolveUser(like);

  const res = await page.context().request.post(`${BACKEND_URL}/api/test/login`, {
    data: user,
  });

  if (!res.ok()) {
    throw new Error(`Test login failed (${res.status()}): ${await res.text()}`);
  }

  const { accessToken, refreshToken } = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
  };

  await page.goto(
    `${FRONTEND_URL}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`,
  );

  // AuthCallbackPage navigates to "/" once tokens are accepted.
  await page.waitForURL(`${FRONTEND_URL}/`);

  // Header shows the user's name when auth state has been picked up.
  await page.getByText(user.name, { exact: true }).first().waitFor({
    state: 'visible',
    timeout: 10_000,
  });

  return user;
}
