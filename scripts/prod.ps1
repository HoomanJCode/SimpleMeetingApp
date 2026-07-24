<#
.SYNOPSIS
  Production-like run (PowerShell, Windows). Starts the app with real
  Google OAuth via backend/.env and opens it in your browser.

.DESCRIPTION
  Workflow:
    1. Install any missing node_modules in backend/, frontend/, tests/
       (including Playwright Chromium binary if tests/ was empty).
    2. If backend/.env is missing AND stdin is a TTY, run the env-wizard
       prompts inline (JWT_SECRET generator, URL/port/NODE_ENV
       validators, overwrite guard). If it's missing in non-TTY mode
       (CI / piped), exit 1 with a clear hint.
    3. Apply the windowsCompat env overlay from scripts/test-env.ps1
       to the backend. NO test secrets (real OAuth only).
    4. Spawn backend (`npm run dev`) and frontend (`npm run dev --host
       127.0.0.1 --port 5173`) as native child processes.
    5. Open http://localhost:5173 in the default browser.
    6. Clean shutdown via Ctrl+C + taskkill /F /T.

  Linux/macOS users: run scripts/prod.sh.

  KEEP IN SYNC with scripts/prod.sh.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
    Write-Host '✗ scripts/prod.ps1 is Windows-only. Use scripts/prod.sh on Linux/macOS.' -ForegroundColor Red
    exit 1
}

$Root          = Resolve-Path (Join-Path $PSScriptRoot '..')
$Backend       = Join-Path $Root    'backend'
$Frontend      = Join-Path $Root    'frontend'
$EnvPath       = Join-Path $Backend '.env'
$ExamplePath   = Join-Path $Backend '.env.example'
$TestEnvPath   = Join-Path $PSScriptRoot 'test-env.ps1'
$MaxAttempts   = 3
$IsInteractive = -not [Console]::IsInputRedirected

# Ctrl+C aborts cleanly: a top-level trap catches it whether we are
# prompting in the wizard or waiting in the backend loop.
trap {
    Write-Host ''
    Write-Host '  Aborted.' -ForegroundColor Yellow
    exit 130
}

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

# ---- Helpers for the inline env wizard ------------------------------
function Get-CwdRelative {
    param([Parameter(Mandatory)][string]$Full)
    $cwd = (Get-Location).Path
    if ($Full.Length -gt $cwd.Length -and
        $Full.Substring(0, $cwd.Length).Equals($cwd, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $Full.Substring($cwd.Length).TrimStart('\', '/')
    }
    return $Full
}

function Test-ValidUrl {
    param([Parameter(Mandatory)][string]$Url)
    try {
        $u = New-Object System.Uri $Url
        return ($u.Scheme -eq 'http' -or $u.Scheme -eq 'https')
    } catch { return $false }
}

function Test-ValidPort {
    param([Parameter(Mandatory)][string]$Port)
    if ($Port -notmatch '^\d+$') { return $false }
    $n = [int]$Port
    return ($n -gt 0 -and $n -lt 65536)
}

function New-JwtSecret {
    # 64 hex chars from the .NET CSPRNG (maps BCryptGenRandom on Windows
    # and /dev/urandom on Unix to the same surface API).
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object 'System.Byte[]' 32
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return (-join ($bytes | ForEach-Object { $_.ToString('x2') }))
}

function Ask {
    param(
        [Parameter(Mandatory)][string]$Question,
        [string]$Default = '',
        [scriptblock]$Validator = $null
    )
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        $prompt = if ($Default) { "$Question ($Default): " } else { "$Question: " }
        Write-Host -NoNewline $prompt
        $answer = Read-Host
        if ([string]::IsNullOrWhiteSpace($answer)) {
            $value = $Default
        } else {
            $value = $answer.Trim()
        }
        if ($null -ne $Validator) {
            $err = & $Validator $value
            if ($err) {
                Write-Host "  ✗ $err" -ForegroundColor Red
                if ($i + 1 -ge $MaxAttempts) {
                    Write-Host "  (gave up after $MaxAttempts attempts; re-run prod to retry)" -ForegroundColor Yellow
                    return $value
                }
                continue
            }
        }
        return $value
    }
    return $null
}

# ---- backend/.env check + inline wizard -----------------------------
if (-not (Test-Path $EnvPath)) {
    if (-not $IsInteractive) {
        Write-Host '✗ backend/.env not found.' -ForegroundColor Red
        Write-Host '  Production mode needs a real .env file. This run is non-interactive' -ForegroundColor Red
        Write-Host '  (CI / piped), so the wizard cannot run. Two paths:' -ForegroundColor Red
        Write-Host ''
        Write-Host '    1. Create backend/.env yourself by copying from backend/.env.example' -ForegroundColor DarkGray
        Write-Host '       and filling in real Google OAuth credentials.' -ForegroundColor DarkGray
        Write-Host '    2. Run scripts/prod.ps1 from an interactive PowerShell session' -ForegroundColor DarkGray
        Write-Host '       so the inline env wizard can prompt for the values.' -ForegroundColor DarkGray
        exit 1
    }

    Write-Host '▶ backend/.env not found - launching inline .env setup.' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  Production mode needs real values (Google OAuth credentials, JWT_SECRET, etc).' -ForegroundColor Cyan
    Write-Host '  Press <Enter> to accept any default. JWT_SECRET can be auto-generated.' -ForegroundColor DarkGray
    Write-Host ''

    if (-not (Test-Path $ExamplePath)) {
        Write-Host '  (note: backend/.env.example not found; this is fine - prompts will use inline defaults)' -ForegroundColor DarkGray
    }

    # Overwrite guard - never destroy a real .env silently.
    if (Test-Path $EnvPath) {
        Write-Host ('  · ' + (Get-CwdRelative $EnvPath) + ' already exists.') -ForegroundColor Yellow
        $overwrite = Ask '  Overwrite? (y/N)' 'N' { param($v)
            if ($v -match '^(y|yes|n|no)$') { return $null } else { return 'answer with y or n' }
        }
        if ($overwrite -notmatch '^y(es)?$') {
            Write-Host '  Aborted. Existing .env left untouched.' -ForegroundColor Yellow
            exit 0
        }
        Write-Host ''
        Write-Host '  Heads-up: if you regenerate JWT_SECRET, every existing user' -ForegroundColor Yellow
        Write-Host '  session becomes invalid (token signatures change).' -ForegroundColor Yellow
        Write-Host ''
    }

    $out = [ordered]@{}

    # JWT_SECRET
    $secretMode = Ask 'JWT_SECRET (required, min 32 chars): (g)enerate or (e)nter' 'g' { param($v)
        if ($v -match '^(g|e)$') { return $null } else { return 'press g to generate, e to enter your own' }
    }
    if ($secretMode -match '^g') {
        $out['JWT_SECRET'] = New-JwtSecret
        Write-Host ('  ✓ Generated JWT_SECRET (' + $out['JWT_SECRET'].Length + ' chars): ' + $out['JWT_SECRET'].Substring(0, 8) + '…') -ForegroundColor Green
    } else {
        $out['JWT_SECRET'] = Ask '  Enter your JWT_SECRET (≥ 32 chars)' '' { param($v)
            if ($v.Length -ge 32) { return $null } else { return "must be at least 32 characters (got $($v.Length))" }
        }
    }

    # NODE_ENV
    $out['NODE_ENV'] = Ask 'NODE_ENV' 'development' { param($v)
        if ($v -match '^(development|production|test)$') { return $null } else { return 'must be development | production | test' }
    }

    # PORT
    $out['PORT'] = Ask 'PORT' '3001' { param($v)
        if (Test-ValidPort $v) { return $null } else { return 'must be a TCP port number (1-65535)' }
    }

    # HOST
    Write-Host '  Tip: HOST=127.0.0.1 avoids a Windows IPv4/IPv6 gotcha; works on macOS/Linux too.' -ForegroundColor DarkGray
    $out['HOST'] = Ask 'HOST' '127.0.0.1'

    Write-Host ''
    Write-Host '  ┌─────────────────────────────────────────────────────────────────┐' -ForegroundColor DarkGray
    Write-Host '  │  Google OAuth credentials - where to get them                   │' -ForegroundColor DarkGray
    Write-Host '  │                                                                 │' -ForegroundColor DarkGray
    Write-Host '  │  Full step-by-step walkthrough with exact field names:           │' -ForegroundColor DarkGray
    Write-Host '  │      documents/google-oauth-setup.md                            │' -ForegroundColor DarkGray
    Write-Host '  │                                                                 │' -ForegroundColor DarkGray
    Write-Host '  │  Quick version:                                                 │' -ForegroundColor DarkGray
    Write-Host '  │    1. https://console.cloud.google.com   (sign in with Gmail)   │' -ForegroundColor DarkGray
    Write-Host '  │    2. Top bar -> Select a project -> New project                │' -ForegroundColor DarkGray
    Write-Host '  │         (e.g. ''IrMeetingApp Local'') -> Create                   │' -ForegroundColor DarkGray
    Write-Host '  │    3. APIs & Services -> OAuth consent screen                   │' -ForegroundColor DarkGray
    Write-Host '  │         -> External -> Create                                   │' -ForegroundColor DarkGray
    Write-Host '  │         -> App name, support email, dev contact -> Save (x2)    │' -ForegroundColor DarkGray
    Write-Host '  │         -> Test users -> Add YOUR Gmail -> Save and Continue    │' -ForegroundColor DarkGray
    Write-Host '  │    4. APIs & Services -> Credentials -> Create Credentials      │' -ForegroundColor DarkGray
    Write-Host '  │         -> OAuth client ID                                      │' -ForegroundColor DarkGray
    Write-Host '  │         -> Application type: Web application                    │' -ForegroundColor DarkGray
    Write-Host '  │         -> Authorized redirect URIs:                            │' -ForegroundColor DarkGray
    Write-Host '  │            http://localhost:3001/api/auth/google/callback       │' -ForegroundColor DarkGray
    Write-Host '  │         -> Create                                               │' -ForegroundColor DarkGray
    Write-Host '  │    5. Copy the ''Your Client ID'' and ''Your Client secret''        │' -ForegroundColor DarkGray
    Write-Host '  │         values from the modal (shown ONLY ONCE).                │' -ForegroundColor DarkGray
    Write-Host '  │    6. Paste them into the prompts below.                        │' -ForegroundColor DarkGray
    Write-Host '  │                                                                 │' -ForegroundColor DarkGray
    Write-Host '  │  Client ID format     : ....apps.googleusercontent.com         │' -ForegroundColor DarkGray
    Write-Host '  │  Client secret format : GOCSPX-...                              │' -ForegroundColor DarkGray
    Write-Host '  │  Authorized redirect URI must EXACTLY match the one in          │' -ForegroundColor DarkGray
    Write-Host '  │  GOOGLE_REDIRECT_URI below (byte-by-byte; no trailing slash,    │' -ForegroundColor DarkGray
    Write-Host '  │  http≠https, port matters).                                     │' -ForegroundColor DarkGray
    Write-Host '  └─────────────────────────────────────────────────────────────────┘' -ForegroundColor DarkGray
    Write-Host ''

    $out['GOOGLE_CLIENT_ID']     = Ask 'GOOGLE_CLIENT_ID (required)' '' { param($v)
        if ($v.Length -ge 5) { return $null } else { return 'required' }
    }
    $out['GOOGLE_CLIENT_SECRET'] = Ask 'GOOGLE_CLIENT_SECRET (required)' '' { param($v)
        if ($v.Length -ge 5) { return $null } else { return 'required' }
    }
    $out['GOOGLE_REDIRECT_URI']  = Ask 'GOOGLE_REDIRECT_URI' 'http://localhost:3001/api/auth/google/callback' { param($v)
        if (Test-ValidUrl $v) { return $null } else { return 'must be a valid http(s) URL (e.g. https://example.com/callback)' }
    }
    $out['FRONTEND_URL']         = Ask 'FRONTEND_URL' 'http://localhost:5173' { param($v)
        if (Test-ValidUrl $v) { return $null } else { return 'must be a valid http(s) URL' }
    }
    $out['JWT_EXPIRATION']             = Ask 'JWT_EXPIRATION (access token TTL)' '15m'
    $out['REFRESH_TOKEN_EXPIRATION']   = Ask 'REFRESH_TOKEN_EXPIRATION (refresh token TTL)' '30d'
    $out['DATABASE_PATH']              = Ask 'DATABASE_PATH' './data/irmeeting.db'

    # Post-loop sanity check
    $required = @{
        'GOOGLE_CLIENT_ID'     = $out['GOOGLE_CLIENT_ID']
        'GOOGLE_CLIENT_SECRET' = $out['GOOGLE_CLIENT_SECRET']
        'JWT_SECRET'           = $out['JWT_SECRET']
    }
    $missingRequired = @($required.Keys | Where-Object { [string]::IsNullOrEmpty($required[$_]) })
    if ($missingRequired.Count -gt 0) {
        Write-Host ''
        Write-Host ('  ✗ Required fields missing: ' + ($missingRequired -join ', ')) -ForegroundColor Red
        Write-Host '    Re-run: scripts/prod.ps1' -ForegroundColor Yellow
        exit 1
    }

    # Compose & write
    $header = "# Generated by ``scripts/prod.ps1`` on $([DateTime]::UtcNow.ToString('o'))`n# Edit freely; changes take effect on the next ``scripts/prod.ps1``."
    $body = @(
        '# Server'
        "NODE_ENV=$($out['NODE_ENV'])"
        "PORT=$($out['PORT'])"
        "HOST=$($out['HOST'])"
        ''
        '# Google OAuth'
        "GOOGLE_CLIENT_ID=$($out['GOOGLE_CLIENT_ID'])"
        "GOOGLE_CLIENT_SECRET=$($out['GOOGLE_CLIENT_SECRET'])"
        "GOOGLE_REDIRECT_URI=$($out['GOOGLE_REDIRECT_URI'])"
        ''
        '# JWT'
        "JWT_SECRET=$($out['JWT_SECRET'])"
        "JWT_EXPIRATION=$($out['JWT_EXPIRATION'])"
        "REFRESH_TOKEN_EXPIRATION=$($out['REFRESH_TOKEN_EXPIRATION'])"
        ''
        '# Frontend URL (for CORS and redirects)'
        "FRONTEND_URL=$($out['FRONTEND_URL'])"
        ''
        '# Database'
        "DATABASE_PATH=$($out['DATABASE_PATH'])"
        ''
    ) -join "`n"

    try {
        [System.IO.File]::WriteAllText($EnvPath, $header + "`n" + $body)
        Write-Host ''
        $lineCount = ($header + "`n" + $body).Split("`n").Length - 1
        Write-Host ('✓ Wrote ' + $lineCount + ' lines to ' + (Get-CwdRelative $EnvPath)) -ForegroundColor Green
        Write-Host '  (Windows has no POSIX mode bits; .env inherits the parent ACL.)' -ForegroundColor DarkGray
        Write-Host ''
    } catch {
        Write-Host ('  ✗ failed to write ' + (Get-CwdRelative $EnvPath) + ': ' + $_.Exception.Message) -ForegroundColor Red
        exit 1
    }
}

# ---- Load test env (we only need WindowsCompat for backend overlay) -
. $TestEnvPath

function Get-BackendEnv {
    $env = @{}
    foreach ($k in $script:WindowsCompat.Keys) { $env[$k] = $script:WindowsCompat[$k] }
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
Write-Host '▶ Starting in PROD mode (real Google OAuth from backend/.env, test routes disabled)' -ForegroundColor Cyan
Write-Host ''

# Snapshot parent env, layer backend overlay, restore for frontend.
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

$FrontendProc = Start-Process -FilePath (Resolve-Npm) `
    -ArgumentList @('run','dev','--','--host','127.0.0.1','--port','5173') `
    -WorkingDirectory $Frontend `
    -NoNewWindow `
    -PassThru

# Ctrl+C handler
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
} catch {
    Write-Warning ("Could not register Ctrl+C handler; Ctrl+C may not cleanly kill child processes. Re-run from an interactive PowerShell session. Underlying error: $($_.Exception.Message)")
}

Start-Sleep -Seconds 3
Write-Host '▶ Opening http://localhost:5173 in your default browser...' -ForegroundColor Cyan
Start-Process 'http://localhost:5173'

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
