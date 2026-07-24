/**
 * Single source of truth for development environment variables.
 *
 * Two groups:
 *   - windowsCompat  pins HOST/FRONTEND_URL/PORT to 127.0.0.1 to dodge the
 *                    IPv4/IPv6 mismatch on Windows (Node 17+ resolves localhost
 *                    to ::1, but most servers bind IPv4). Always-on regardless
 *                    of mode: production-like `dev:real` needs it too.
 *   - testSecrets    dummy GOOGLE_*, JWT_SECRET, ENABLE_TEST_ROUTES. Only used
 *                    when /api/test/* routes are wanted.
 *
 * Both groups are exported both individually (for selective merging in
 * scripts/dev.js) and combined as `all` (consumed wholesale by
 * tests/playwright.config.ts).
 */

// `windowsCompat` always overrides `HOST` so the Windows IPv4/IPv6 fix
// survives in `dev:real` too. Because dotenv does not override existing
// process env, this also means any `HOST=` line in `backend/.env` is
// silently ignored. If you need to bind a different address (e.g.
// `HOST=0.0.0.0` for Docker-style testing), pass it on the command line
// BEFORE `npm run dev:real`, e.g.:
//   `HOST=0.0.0.0 npm run dev:real`
// Or edit this file with caution.
const windowsCompat = Object.freeze({
  HOST: '127.0.0.1',
  PORT: '3001',
  FRONTEND_URL: 'http://127.0.0.1:5173',
});

const testSecrets = Object.freeze({
  // Use email/password login instead of Google OAuth in dev/test mode.
  AUTH_METHOD: 'userpass',
  // Enables /api/test/login + /api/test/reset (otherwise 404 in production).
  ENABLE_TEST_ROUTES: '1',
  // Dummy values — the test login endpoint never reaches Google.
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
  // Backend's env.ts requires ≥ 32 chars.
  JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
  JWT_EXPIRATION: '15m',
  REFRESH_TOKEN_EXPIRATION: '30d',
});

const all = Object.freeze({ ...windowsCompat, ...testSecrets });

module.exports = { windowsCompat, testSecrets, all };
