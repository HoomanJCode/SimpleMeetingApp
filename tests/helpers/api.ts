/**
 * Backend endpoints that back the dev-only test routes. The backend
 * must be started with ENABLE_TEST_ROUTES=1 (see tests/playwright.config.ts).
 */

export const BACKEND_URL = `http://127.0.0.1:${process.env.BACKEND_PORT || '3001'}`;
export const FRONTEND_URL = `http://127.0.0.1:${process.env.FRONTEND_PORT || '5173'}`;

interface RawTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Seeds a user and returns valid tokens, mirroring what a real OAuth
 * callback would issue. Used by helpers/auth.ts and by specs that need
 * to perform raw API calls.
 */
export async function getTokensFor(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}): Promise<RawTokens> {
  const res = await fetch(`${BACKEND_URL}/api/test/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });

  if (!res.ok) {
    throw new Error(`Test login failed (${res.status}): ${await res.text()}`);
  }

  return (await res.json()) as RawTokens;
}

/**
 * Truncates all domain tables while preserving the migration ledger.
 * Use between tests for full isolation.
 */
export async function resetDb(): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/test/reset`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`DB reset failed (${res.status}): ${await res.text()}`);
  }
}

/**
 * Fetch wrapper that attaches a bearer token. Use this for API-direct
 * spec setup that bypasses the UI (e.g. creating a meeting, joining one,
 * asserting 403/404 paths).
 *
 * Caller-supplied headers in `init.headers` are spread AFTER the helper's
 * `Authorization`, so a caller can deliberately override the bearer (e.g.
 * to test 401 paths). For genuine authenticated calls, just pass the
 * `token` field and skip `headers`.
 */
export async function authedFetch(
  path: string,
  init: RequestInit & { token: string },
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${init.token}`,
    ...((init.headers as Record<string, string>) ?? {}),
  };

  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
  });
}
