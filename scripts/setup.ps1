<#
.SYNOPSIS
  One-shot setup: install all npm dependencies + Playwright Chromium (PowerShell).

.DESCRIPTION
  Mirrors `npm run setup` exactly so Windows users with no Node / npm
  CLI familiarity can prepare their machine with a single command:
      pwsh -File scripts/setup.ps1
  (or equivalently: `npm run setup:ps`).

  Steps (sequential, stop on first failure):
    1. npm install in <repo root>         (no-op today since we removed
                                            concurrently + kill-port, but
                                            kept for forward-compat)
    2. npm install in <repo>/backend
    3. npm install in <repo>/frontend
    4. npm install in <repo>/tests
    5. npx --no-install playwright install chromium   (browser binary)

  Each step's stdout is streamed to the terminal so install logs are
  visible. The script exits non-zero and prints which step failed,
  so users can see exactly what to debug.

  idem-POTENT (npm install is a no-op when packages are up-to-date).
  Re-running this script after the initial setup is harmless and fast.

  KEEP IN SYNC with scripts/setup.sh and (the legacy) `npm run setup` definition.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

if ((Get-Command npm -ErrorAction SilentlyContinue) -eq $null) {
    Write-Host '✗ npm not found on PATH.' -ForegroundColor Red
    Write-Host '  Install Node.js 20+ from https://nodejs.org/' -ForegroundColor Yellow
    exit 1
}

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')

$InstallDirs = @(
    @{ Name = 'root     '; Dir = $Root },
    @{ Name = 'backend  '; Dir = (Join-Path $Root 'backend') },
    @{ Name = 'frontend '; Dir = (Join-Path $Root 'frontend') },
    @{ Name = 'tests    '; Dir = (Join-Path $Root 'tests') }
)

Write-Host '▶ Setting up IrMeetingApp (npm install + Playwright Chromium)' -ForegroundColor Cyan
Write-Host ''

foreach ($s in $InstallDirs) {
    Write-Host ('▶ npm install in ' + $s.Name + '...') -ForegroundColor Yellow
    Push-Location $s.Dir
    try {
        # Stream npm's stdout+stderr inline so the install log is
        # visible. We ride on PowerShell's normal & invocation so
        # exit codes and LastExitCode propagation work as expected.
        & npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host ''
            Write-Host ('  ✗ npm install in ' + $s.Name + ' failed (exit ' + $LASTEXITCODE + ')') -ForegroundColor Red
            exit $LASTEXITCODE
        }
    } finally {
        Pop-Location
    }
}

Write-Host ''
Write-Host '▶ Installing Playwright Chromium (browser binary)...' -ForegroundColor Yellow
Push-Location (Join-Path $Root 'tests')
try {
    # --no-install keeps npx from upgrading playwright itself to a
    # different minor; we only want the OS-level browser binary.
    & npx --no-install playwright install chromium
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host ('  ✗ playwright install failed (exit ' + $LASTEXITCODE + ')') -ForegroundColor Red
        Write-Host '  Check your internet connection and disk space, then re-run.' -ForegroundColor Yellow
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

Write-Host ''
Write-Host '✓ Setup complete.' -ForegroundColor Green
Write-Host '  Next:' -ForegroundColor Cyan
Write-Host '    pwsh -File scripts/dev.ps1          # start backend + frontend (test mode)' -ForegroundColor Cyan
Write-Host '    pwsh -File scripts/env-wizard.ps1   # create backend/.env for real-mode dev' -ForegroundColor Cyan
