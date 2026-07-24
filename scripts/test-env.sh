#!/usr/bin/env bash
#
# Single source of truth for dev/test environment variables (Bash).
#
# Two groups:
#   WINDOWS_COMPAT_*   pins HOST/PORT/FRONTEND_URL to 127.0.0.1 to dodge
#                      the IPv4/IPv6 mismatch on Windows (Node 17+
#                      resolves localhost -> ::1, but most servers bind
#                      IPv4). Always-on regardless of mode: production-
#                      like dev:real needs it too.
#   TEST_SECRET_*      dummy GOOGLE_*, JWT_SECRET, ENABLE_TEST_ROUTES.
#                      Only used when /api/test/* routes are wanted
#                      (i.e. test mode is enabled by scripts/dev).
#
# Usage from another script:
#     . "$(dirname "${BASH_SOURCE[0]}")/test-env.sh"
#     prefix=$(backend_env_prefix test)        # or 'real'
#     env $prefix npm run dev
#
# KEEP IN SYNC with:
#   - scripts/test-env.cjs (consumed by tests/playwright.config.ts)
#   - scripts/test-env.ps1 (PowerShell equivalent consumed by dev.ps1)

# windowsCompat - ALWAYS applied (test mode AND real mode) because the
# pinning fixes a Windows bug, not just a test-mode concern.
WINDOWS_COMPAT_HOST=127.0.0.1
WINDOWS_COMPAT_PORT=3001
WINDOWS_COMPAT_FRONTEND_URL=http://127.0.0.1:5173

# testSecrets - applied ONLY in test mode. Dummy values; the test login
# endpoint never reaches Google. Backend's env.ts requires >= 32 chars.
TEST_SECRET_ENABLE_TEST_ROUTES=1
TEST_SECRET_AUTH_METHOD=userpass
TEST_SECRET_GOOGLE_CLIENT_ID=test-google-client-id
TEST_SECRET_GOOGLE_CLIENT_SECRET=test-google-client-secret
TEST_SECRET_GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
TEST_SECRET_JWT_SECRET=test-jwt-secret-at-least-32-characters-long
TEST_SECRET_JWT_EXPIRATION=15m
TEST_SECRET_REFRESH_TOKEN_EXPIRATION=30d

# backend_env_prefix MODE  ->  prints "KEY=VAL KEY=VAL ..." suitable for
# `env $PREFIX npm run dev`. MODE is 'test' (default) or 'real'; 'real'
# omits the test-secrets layer so the backend reads backend/.env instead.
#
# Why a single space-separated string instead of `env -i`? Because we
# want every other env var (PATH, USER, HOME, TMPDIR, npm_config_*) to
# be inherited normally. Listing only the overrides is the right
# shape.
backend_env_prefix() {
    local mode="${1:-test}"
    local prefix="HOST=$WINDOWS_COMPAT_HOST PORT=$WINDOWS_COMPAT_PORT FRONTEND_URL=$WINDOWS_COMPAT_FRONTEND_URL"
    if [ "$mode" = "test" ]; then
        prefix="$prefix \
            ENABLE_TEST_ROUTES=$TEST_SECRET_ENABLE_TEST_ROUTES \
            AUTH_METHOD=$TEST_SECRET_AUTH_METHOD \
            GOOGLE_CLIENT_ID=$TEST_SECRET_GOOGLE_CLIENT_ID \
            GOOGLE_CLIENT_SECRET=$TEST_SECRET_GOOGLE_CLIENT_SECRET \
            GOOGLE_REDIRECT_URI=$TEST_SECRET_GOOGLE_REDIRECT_URI \
            JWT_SECRET=$TEST_SECRET_JWT_SECRET \
            JWT_EXPIRATION=$TEST_SECRET_JWT_EXPIRATION \
            REFRESH_TOKEN_EXPIRATION=$TEST_SECRET_REFRESH_TOKEN_EXPIRATION"
    fi
    printf '%s' "$prefix"
}
