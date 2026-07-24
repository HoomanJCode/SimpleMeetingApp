<#
.SYNOPSIS
  Single source of truth for dev/test environment variables (PowerShell).

.DESCRIPTION
  Two groups:
    - $script:WindowsCompat  pins HOST/PORT/FRONTEND_URL to 127.0.0.1 to
                             dodge the IPv4/IPv6 mismatch on Windows
                             (Node 17+ resolves localhost -> ::1, but
                             most servers bind IPv4). Always-on regardless
                             of mode: production-like dev:real needs it too.
    - $script:TestSecrets    dummy GOOGLE_*, JWT_SECRET, ENABLE_TEST_ROUTES.
                             Only used when /api/test/* routes are wanted
                             (i.e. test mode is enabled by scripts/dev).

  Both groups are also exposed individually so scripts/dev.ps1 can merge
  them selectively into the spawned backend's env block.

  Dot-source this file from env-wizard.ps1 and dev.ps1:
      . (Join-Path $PSScriptRoot 'test-env.ps1')

  KEEP IN SYNC with:
    - scripts/test-env.cjs (consumed by tests/playwright.config.ts via require)
    - scripts/test-env.sh  (Bash equivalent consumed by scripts/dev.sh)

  windowsCompat always overrides HOST so the Windows IPv4/IPv6 fix
  survives dev:real too. Because the backend's dotenv bootstrap does
  not override existing process env, this also means any HOST= line
  in backend/.env is silently ignored. If you need to bind a different
  address (e.g. HOST=0.0.0.0 for Docker-style testing), pass it on the
  command line BEFORE scripts/dev.ps1 --real, e.g.:
      $env:HOST = '0.0.0.0'; scripts/dev.ps1 --real
#>

# windowsCompat - ALWAYS applied (test mode AND real mode) because the
# pinning fixes a Windows bug, not just a test-mode concern.
$script:WindowsCompat = @{
    HOST         = '127.0.0.1'
    PORT         = '3001'
    FRONTEND_URL = 'http://127.0.0.1:5173'
}

# testSecrets - applied ONLY in test mode. Dummy values; the test login
# endpoint never reaches Google. Backend's env.ts requires JWT_SECRET >= 32 chars.
$script:TestSecrets = @{
    ENABLE_TEST_ROUTES         = '1'
    GOOGLE_CLIENT_ID           = 'test-google-client-id'
    GOOGLE_CLIENT_SECRET       = 'test-google-client-secret'
    GOOGLE_REDIRECT_URI        = 'http://localhost:3001/api/auth/google/callback'
    JWT_SECRET                 = 'test-jwt-secret-at-least-32-characters-long'
    JWT_EXPIRATION             = '15m'
    REFRESH_TOKEN_EXPIRATION   = '30d'
}
