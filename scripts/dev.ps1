<#
.SYNOPSIS
  Cross-platform dev orchestrator (PowerShell, Windows-only).

.DESCRIPTION
  Starts backend + frontend natively as concurrent child processes.

  Default mode = TEST (no .env needed):
    - Backend runs with dummy OAuth + JWT_SECRET + ENABLE_TEST_ROUTES=1.
    - Frontend binds to 127.0.0.1:5173 (avoids the Windows IPv4/IPv6 mismatch).

  Flags:
    --be         only the backend
    --fe         only the frontend
    --real       run the backend with backend/.env (no test routes)
    --no-wizard  skip auto-wizard in --real mode (for deploy scripts that
                 create .env out-of-band)

  In --real mode, auto-launches env-wizard if backend/.env is missing
  AND stdin is a TTY.

  Process management:
    - Each child is spawned with Start-Process -NoNewWindow so they
      share our console. Windows broadcasts Ctrl+C to every process
      attached to the console, so npm and node receive SIGINT natively.
    - We register a [Console]::CancelKeyPress handler as a belt-and-
      suspenders guarantee that orphans (the npm.cmd shim, the tsx watch
      child node processes) get reaped with `taskkill /F /T`.
    - 200ms grace after the CancelKeyPress event lets the native
      console broadcast settle so SIGINT-handling children can shut
      down gracefully before the taskkill wipe.
    - The user's env-var overlay is layered onto the parent's process
      env block just before each Start-Process; Start-Process snapshots
      that block synchronously during CreateProcess, so the child sees
      the right env without us having to mutate any shell startup file.

  This script is Windows-only. Linux/macOS users: run scripts/dev.sh.

  KEEP IN SYNC with scripts/dev.sh.
#>
[CmdletBinding()]
param(
    [switch]$Be,
    [switch]$Fe,
    [switch]$Real,
    [switch]$NoWizard
)

# ---- OS guard: Windows-only --------------------------------------------
# $env:OS is the canonical cross-version check (works in PS 2.0+).
# $IsWindows / $IsLinux / $IsMacOS are PS 6+ automatic variables, so we
# don't rely on them for compat with Windows PowerShell 5.1.
if ($env:OS -ne 'Windows_NT') {
    Write-Host '✗ scripts/dev.ps1 is Windows-only. Use scripts/dev.sh on Linux/macOS.' -ForegroundColor Red
    exit 1
}

if ($Be -and $Fe) {
    Write-Host '✗ --be and --fe cannot be combined' -ForegroundColor Red
    exit 1
}

$ErrorActionPreference = 'Stop'

$Root          = Resolve-Path (Join-Path $PSScriptRoot '..')
$Backend       = Join-Path $Root    'backend'
$Frontend      = Join-Path $Root    'frontend'
$EnvPath       = Join-Path $Backend '.env'
$WizardPath    = Join-Path $PSScriptRoot 'env-wizard.ps1'
$TestEnvPath   = Join-Path $PSScriptRoot 'test-env.ps1'

# Console.TTY? Used only by the --real auto-wizard branch.
$IsInteractive = -not [Console]::IsInputRedirected

# Dot-source the test-env values. After this line, $script:WindowsCompat
# and $script:TestSecrets are populated at script scope so the picker
# helpers below can use them directly.
. $TestEnvPath

function Test-EnvFileRequired {
    param(
        [Parameter(Mandatory)][string]$EnvPath,
        [Parameter(Mandatory)][string]$WizardPath
    )

    if (Test-Path $EnvPath) { return }

    if ($NoWizard) {
        Write-Host '✗ backend/.env not found and --no-wizard was passed.' -ForegroundColor Red
        Write-Host '  Either create backend/.env manually (copy from backend/.env.example)' -ForegroundColor Red
        Write-Host '  or drop --no-wizard to let the wizard run.' -ForegroundColor Red
        exit 1
    }
    if (-not $IsInteractive) {
        Write-Host '✗ backend/.env not found.' -ForegroundColor Red
        Write-Host '  This run is non-interactive (CI or piped), so the wizard cannot run.' -ForegroundColor Red
        Write-Host '  Create backend/.env yourself, then re-run. Two paths:' -ForegroundColor Red
        Write-Host ''
        Write-Host '    1. Fast manual route (e.g. Docker secret, k8s, deploy script):' -ForegroundColor DarkGray
        Write-Host '         Create backend/.env by copying from backend/.env.example,' -ForegroundColor DarkGray
        Write-Host '         then fill in your real credentials.' -ForegroundColor DarkGray
        Write-Host ''
        Write-Host '    2. Run the wizard in a real terminal:' -ForegroundColor DarkGray
        Write-Host '         scripts/env-wizard.ps1' -ForegroundColor DarkGray
        Write-Host '         scripts/dev.ps1 --real' -ForegroundColor DarkGray
        Write-Host ''
        Write-Host '    (Tip: pass --no-wizard if your deploy script will create .env before this run.)' -ForegroundColor DarkGray
        exit 1
    }

    Write-Host '▶ backend/.env not found - launching env wizard first.' -ForegroundColor Cyan
    Write-Host ''

    # Spawn a fresh pwsh so the wizard's Read-Host reads from a pristine
    # TTY (no inherited readline state from this script's parser).
    & pwsh -NoProfile -File $WizardPath
    $wizardExit = $LASTEXITCODE
    if ($wizardExit -ne 0) {
        Write-Host ("✗ env wizard exited with status $wizardExit") -ForegroundColor Red
        Write-Host '  backend/.env was not created - aborting before starting servers.' -ForegroundColor Red
        exit $wizardExit
    }
    if (-not (Test-Path $EnvPath)) {
        Write-Host '✗ env wizard reported success but backend/.env still missing - aborting.' -ForegroundColor Red
        exit 1
    }
}

function Get-BackendEnv {
    $env = @{}
    foreach ($k in $script:WindowsCompat.Keys) { $env[$k] = $script:WindowsCompat[$k] }
    if (-not $Real) {
        foreach ($k in $script:TestSecrets.Keys) { $env[$k] = $script:TestSecrets[$k] }
    }
    return $env
}

function Resolve-Npm {
    # npm on Windows ships as a .cmd batch file; npm.exe is on PATH too,
    # but the .cmd shim handles the shebang-style `npm run N` correctly.
    # Prefer npm.cmd so dependency resolution matches `npm run dev`.
    $c = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    $c = Get-Command npm -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    throw 'npm not found on PATH'
}

# ---- Real-mode env check (before we hand off to Start-Process) ----------
if ($Real -and -not $Fe) {
    Test-EnvFileRequired -EnvPath $EnvPath -WizardPath $WizardPath
}

# ---- Process tracking (mutated by Start-Process / Refresh) --------------
$BackendProc  = $null
$FrontendProc = $null

# Ctrl+C handler: 200ms grace lets the native console broadcast (which
# -NoNewWindow enables) settle, so SIGINT-handling children can shut
# down gracefully before we force-kill them. The shorter 200ms (vs
# scripts/dev.sh's 300ms) reflects: on Windows, -NoNewWindow shares
# the console so the OS broadcasts Ctrl+C immediately; on Linux the
# signal has to transit from terminal to npm to node individually, so
# a bit more time is needed. $eventArgs.Cancel=$true suppresses
# PowerShell's default behavior of terminating the whole script
# immediately on Ctrl+C.
# Initialise explicitly so the finally-block's null guard is well-defined
# even if [Console]::CancelKeyPress.Add() throws on registration.
$CancelHandler = $null
try {
    # 200ms grace lets the native console broadcast (enabled by
    # -NoNewWindow on both children) settle, so SIGINT-handling
    # children can shut down gracefully before the taskkill wipe.
    # $eventArgs.Cancel=$true suppresses PowerShell's default
    # behavior of terminating the entire script immediately on Ctrl+C.
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
    # If the registration fails (extremely rare, but possible in a
    # non-console session), we still proceed: the wait-loop + finally
    # block in this script will tree-kill orphaned children on normal
    # exit. Only Ctrl+C mid-run is degraded; warn loudly so users
    # notice.
    Write-Warning ("Could not register Ctrl+C handler; Ctrl+C may not cleanly kill child processes. Re-run from an interactive PowerShell session. Underlying error: $($_.Exception.Message)")
}

try {
    # ---- Spawn backend (with env-var overlay) ----
    if (-not $Fe) {
        $backendEnv = Get-BackendEnv
        $npm        = Resolve-Npm

        Write-Host ''
        if ($Real) {
            Write-Host '▶ Starting in REAL mode (backend uses .env, test routes disabled, Windows env still pinned)' -ForegroundColor Cyan
        } else {
            Write-Host '▶ Starting in TEST mode (ENABLE_TEST_ROUTES=1, dummy OAuth/JWT, Windows env pinned)' -ForegroundColor Cyan
        }
        Write-Host ''

        # Snapshot parent's current env, layer backend's overlay on top
        # for the brief moment Start-Process snapshots it, then restore
        # in the finally so the frontend doesn't inherit backend secrets.
        $savedEnv = @{}
        foreach ($k in $backendEnv.Keys) {
            $savedEnv[$k] = [Environment]::GetEnvironmentVariable($k, 'Process')
            [Environment]::SetEnvironmentVariable($k, $backendEnv[$k], 'Process')
        }
        try {
            $BackendProc = Start-Process -FilePath $npm `
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
    }

    # ---- Spawn frontend (no env overlay - it inherits clean parent) ----
    if (-not $Be) {
        $FrontendProc = Start-Process -FilePath (Resolve-Npm) `
            -ArgumentList @('run','dev','--','--host','127.0.0.1','--port','5173') `
            -WorkingDirectory $Frontend `
            -NoNewWindow `
            -PassThru
    }

    if ($null -eq $BackendProc -and $null -eq $FrontendProc) {
        Write-Host '✗ nothing to start (you asked for both --be and --fe which is impossible)' -ForegroundColor Red
        exit 1
    }

    # ---- Wait loop: first child to exit triggers a tree-kill of the other ----
    while ($true) {
        if ($BackendProc)  { $BackendProc.Refresh()  }
        if ($FrontendProc) { $FrontendProc.Refresh() }

        $bExit = ($null -ne $BackendProc)  -and $BackendProc.HasExited
        $fExit = ($null -ne $FrontendProc) -and $FrontendProc.HasExited

        if ($bExit -and $fExit)         { break }
        if ($bExit -and $FrontendProc)  { Write-Host '▶ backend exited; stopping frontend' -ForegroundColor Yellow; & taskkill.exe /F /T /PID $FrontendProc.Id 2>$null; break }
        if ($fExit -and $BackendProc)   { Write-Host '▶ frontend exited; stopping backend' -ForegroundColor Yellow; & taskkill.exe /F /T /PID $BackendProc.Id 2>$null; break }

        Start-Sleep -Milliseconds 500
    }

    # Aggregate exit codes for the shell caller (max wins, mirrors CI behaviour).
    $finalCode = 0
    if ($BackendProc -and $BackendProc.HasExited) {
        $finalCode = [Math]::Max($finalCode, [int]$BackendProc.ExitCode)
    }
    if ($FrontendProc -and $FrontendProc.HasExited) {
        $finalCode = [Math]::Max($finalCode, [int]$FrontendProc.ExitCode)
    }
    exit $finalCode
}
finally {
    # Always remove the cancel handler so the script's process group
    # doesn't keep a handler reference past exit (matters when this
    # script is sourced from a longer-lived parent shell).
    if ($null -ne $CancelHandler) {
        [Console]::CancelKeyPress.Remove($CancelHandler)
    }
    # Belt + suspenders: if we exited via the wait loop (one child died
    # on its own and we taskkilled the other), confirm no zombies.
    foreach ($proc in @($BackendProc, $FrontendProc)) {
        if ($null -ne $proc -and -not $proc.HasExited) {
            & taskkill.exe /F /T /PID $proc.Id 2>$null
        }
    }
}
