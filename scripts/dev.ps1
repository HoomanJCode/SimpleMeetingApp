<#
.SYNOPSIS
  Dev script (PowerShell, Windows). One command to start the app in
  test mode in your browser.

.DESCRIPTION
  Workflow:
    1. Check node_modules in backend/, frontend/, tests/. Install any
       missing (including Playwright Chromium binary if tests/ was empty).
    2. Apply the windowsCompat + testSecrets env overlay from
       scripts/test-env.ps1 to the backend.
    3. Spawn backend (`npm run dev`) and frontend (`npm run dev --host
       127.0.0.1 --port 5173`) as native child processes.
    4. Open http://localhost:5173 in the default browser.
    5. Wait; Ctrl+C cleanly tears both down via taskkill /F /T on
       native Windows console broadcast.

  Test mode = no .env needed: backend uses dummy OAuth + a hardcoded
  JWT_SECRET + ENABLE_TEST_ROUTES=1. For real-Google-OAuth mode, run
  scripts/prod.ps1 instead.

  Linux/macOS users: run scripts/dev.sh.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
    Write-Host '✗ scripts/dev.ps1 is Windows-only. Use scripts/dev.sh on Linux/macOS.' -ForegroundColor Red
    exit 1
}

$Root          = Resolve-Path (Join-Path $PSScriptRoot '..')
$Backend       = Join-Path $Root    'backend'
$Frontend      = Join-Path $Root    'frontend'
$TestEnvPath   = Join-Path $PSScriptRoot 'test-env.ps1'

# ---- Install-if-missing ----------------------------------------------
$missing = @()
foreach ($sub in @('backend','frontend','tests')) {
    if (-not (Test-Path (Join-Path (Join-Path $Root $sub) 'node_modules'))) {
        $missing += $sub
    }
}
if ($missing.Count -gt 0) {
    Write-Host ('▶ Installing missing dependencies: ' + ($missing -join ', ')) -ForegroundColor Yellow
    foreach ($sub in $missing) {
        Push-Location (Join-Path $Root $sub)
        try {
            & npm install --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) {
                Write-Host ('  ✗ npm install in ' + $sub + ' failed (exit ' + $LASTEXITCODE + ')') -ForegroundColor Red
                exit $LASTEXITCODE
            }
        } finally { Pop-Location }
    }
    if ($missing -contains 'tests') {
        Write-Host '▶ Installing Playwright Chromium (browser binary)...' -ForegroundColor Yellow
        Push-Location (Join-Path $Root 'tests')
        try {
            & npx --no-install playwright install chromium
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        } finally { Pop-Location }
    }
}

# ---- Load test env overlay -------------------------------------------
. $TestEnvPath

# ---- Helpers --------------------------------------------------------
function Get-BackendEnv {
    $env = @{}
    foreach ($k in $script:WindowsCompat.Keys) { $env[$k] = $script:WindowsCompat[$k] }
    foreach ($k in $script:TestSecrets.Keys)   { $env[$k] = $script:TestSecrets[$k] }
    return $env
}

function Resolve-Npm {
    $c = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    $c = Get-Command npm -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    throw 'npm not found on PATH'
}

Write-Host ''
Write-Host '┌───────────────────────────────────────────────────────────────┐' -ForegroundColor Cyan
Write-Host '│  TEST MODE - dummy OAuth, no Google interaction required       │' -ForegroundColor Cyan
Write-Host '│                                                                 │' -ForegroundColor Cyan
Write-Host '│  · Auth: backend exposes POST /api/test/login (dev-only).       │' -ForegroundColor Cyan
Write-Host '│    Any {id,email,name} body mints a valid JWT locally.          │' -ForegroundColor Cyan
Write-Host '│  · The frontend Sign in with Google button is wired up         │' -ForegroundColor Cyan
Write-Host '│    identically; only difference vs PROD is whether the         │' -ForegroundColor Cyan
Write-Host '│    backend hits Google or mocks the reply.                      │' -ForegroundColor Cyan
Write-Host '│  · Enabled via ENABLE_TEST_ROUTES=1 from scripts/test-env.ps1.  │' -ForegroundColor Cyan
Write-Host '│                                                                 │' -ForegroundColor Cyan
Write-Host '│  Want REAL Google OAuth? Ctrl+C now and run instead:           │' -ForegroundColor Cyan
Write-Host '│      scripts/prod.sh            (Linux / macOS, Bash 4+)        │' -ForegroundColor Cyan
Write-Host '│      scripts/prod.ps1           (Windows, PowerShell 5.1+)     │' -ForegroundColor Cyan
Write-Host '│                                                                 │' -ForegroundColor Cyan
Write-Host '│  First time with real Google? See documents/google-oauth-setup │' -ForegroundColor Cyan
Write-Host '│  .md for the step-by-step Cloud Console walkthrough.           │' -ForegroundColor Cyan
Write-Host '└───────────────────────────────────────────────────────────────┘' -ForegroundColor Cyan
Write-Host ''

# ---- Snapshot parent env, layer backend overlay for its spawn only ----
$backendEnv = Get-BackendEnv
$savedEnv = @{}
foreach ($k in $backendEnv.Keys) {
    $savedEnv[$k] = [Environment]::GetEnvironmentVariable($k, 'Process')
    [Environment]::SetEnvironmentVariable($k, $backendEnv[$k], 'Process')
}
$BackendProc = $null
try {
    $BackendProc = Start-Process -FilePath (Resolve-Npm) `
        -ArgumentList 'run','dev' `
        -WorkingDirectory $Backend `
        -NoNewWindow `
        -PassThru
} finally {
    foreach ($k in $backendEnv.Keys) {
        if ($null -eq $savedEnv[$k]) {
            [Environment]::SetEnvironmentVariable($k, $null, 'Process')
        } else {
            [Environment]::SetEnvironmentVariable($k, $savedEnv[$k], 'Process')
        }
    }
}

# ---- Spawn frontend (inherits clean parent env — no backend secrets) --
$FrontendProc = Start-Process -FilePath (Resolve-Npm) `
    -ArgumentList @('run','dev','--','--host','127.0.0.1','--port','5173') `
    -WorkingDirectory $Frontend `
    -NoNewWindow `
    -PassThru

# ---- Ctrl+C handler: 200ms grace + taskkill /F /T for orphans --------
$CancelHandler = $null
try {
    $CancelHandler = [Console]::CancelKeyPress.Add({
        param($sender, $eventArgs)
        $eventArgs.Cancel = $true
        Start-Sleep -Milliseconds 200
        foreach ($proc in @($BackendProc, $FrontendProc)) {
            if ($null -ne $proc -and -not $proc.HasExited) {
                & taskkill.exe /F /T /PID $proc.Id 2>$null
            }
        }
    })
}
catch {
    Write-Warning ("Could not register Ctrl+C handler; Ctrl+C may not cleanly kill child processes. Re-run from an interactive PowerShell session. Underlying error: $($_.Exception.Message)")
}

# ---- Open the browser once the frontend has had time to bind ---------
Start-Sleep -Seconds 3
Write-Host '▶ Opening http://localhost:5173 in your default browser...' -ForegroundColor Cyan
Start-Process 'http://localhost:5173'

# ---- Wait loop + cleanup on first child exit ------------------------
try {
    while ($true) {
        $BackendProc.Refresh()
        $FrontendProc.Refresh()
        $bExit = $BackendProc.HasExited
        $fExit = $FrontendProc.HasExited
        if ($bExit -and $fExit)         { break }
        if ($bExit -and -not $fExit)    { Write-Host '▶ backend exited; stopping frontend' -ForegroundColor Yellow; & taskkill.exe /F /T /PID $FrontendProc.Id 2>$null; break }
        if ($fExit -and -not $bExit)    { Write-Host '▶ frontend exited; stopping backend' -ForegroundColor Yellow; & taskkill.exe /F /T /PID $BackendProc.Id 2>$null; break }
        Start-Sleep -Milliseconds 500
    }
    $exitCode = 0
    if ($BackendProc.HasExited)  { $exitCode = [Math]::Max($exitCode, [int]$BackendProc.ExitCode) }
    if ($FrontendProc.HasExited) { $exitCode = [Math]::Max($exitCode, [int]$FrontendProc.ExitCode) }
    exit $exitCode
} finally {
    if ($null -ne $CancelHandler) { [Console]::CancelKeyPress.Remove($CancelHandler) }
    foreach ($proc in @($BackendProc, $FrontendProc)) {
        if ($null -ne $proc -and -not $proc.HasExited) {
            & taskkill.exe /F /T /PID $proc.Id 2>$null
        }
    }
}
