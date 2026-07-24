<#
.SYNOPSIS
  SQLite database helper (PowerShell).

.DESCRIPTION
  Subcommands:
    reset   Delete the DB file (and any WAL/SHM sidecars). The next time
            the backend starts, it auto-runs migrations + the first-boot
            sample seed on a fresh file. If the backend is currently
            running, stop it first (scripts/kill-servers.ps1).

    seed    Sample-data seeding happens automatically the first time the
            backend boots against an empty DB (see backend/src/db/seed.ts).
            To reseed from scratch:
              scripts/kill-servers.ps1
              scripts/db.ps1 reset
              scripts/dev.ps1

    path    Print the absolute path of the SQLite file (matches
            backend/src/db/connection.ts).

  The DB lives at backend/data/irmeeting.db. The backend creates that
  directory on first start if it doesn't exist.

  KEEP IN SYNC with scripts/db.sh and the (legacy) scripts/db.js.
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('reset', 'seed', 'path')]
    [string]$Subcommand
)

$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Backend = Join-Path $Root 'backend'
$DataDir = Join-Path $Backend 'data'
$DbPath = Join-Path $DataDir 'irmeeting.db'

function Get-CwdRelative {
    param([Parameter(Mandatory)][string]$Full)
    $cwd = (Get-Location).Path
    if ($Full.Length -gt $cwd.Length -and
        $Full.Substring(0, $cwd.Length).Equals($cwd, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $Full.Substring($cwd.Length).TrimStart('\', '/')
    }
    return $Full
}

function Remove-DbFile {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path $Path)) {
        Write-Host ('  · ' + (Get-CwdRelative $Path) + ' did not exist') -ForegroundColor DarkGray
        return
    }
    try {
        Remove-Item -Force $Path
        Write-Host ('  ✔ deleted ' + (Get-CwdRelative $Path)) -ForegroundColor Green
    } catch {
        $msg = ($_.Exception.Message -as [string])
        if ($msg -match 'locked|being used|EBUSY|EPERM|denied') {
            Write-Host ('  ✗ ' + (Get-CwdRelative $Path) + ' is locked.') -ForegroundColor Red
            Write-Host '    Stop the backend first: scripts/kill-servers.ps1' -ForegroundColor Yellow
            exit 1
        }
        throw
    }
}

switch ($Subcommand) {
    'reset' {
        Write-Host '▶ Resetting database' -ForegroundColor Cyan
        if (-not (Test-Path $DataDir)) {
            Write-Host ('  · ' + (Get-CwdRelative $DataDir) + ' does not exist — nothing to reset') -ForegroundColor DarkGray
            return
        }
        Remove-DbFile $DbPath
        Remove-DbFile ($DbPath + '-wal')    # Write-Ahead Log sidecar (only with WAL mode)
        Remove-DbFile ($DbPath + '-shm')    # Shared memory sidecar (only with WAL mode)
        Write-Host ''
        Write-Host '  ✓ Reset complete. Run scripts/dev.ps1 to re-migrate + seed.' -ForegroundColor Green
    }
    'seed' {
        Write-Host '▶ Seed' -ForegroundColor Cyan
        Write-Host '  The backend seeds sample data automatically the first time'
        Write-Host '  it boots against an empty database. To reseed from scratch,'
        Write-Host '  stop the backend, wipe the DB, then start the backend again:'
        Write-Host ''
        Write-Host '    scripts/kill-servers.ps1'
        Write-Host '    scripts/db.ps1 reset'
        Write-Host '    scripts/dev.ps1'
        Write-Host ''
        Write-Host '  See backend/src/db/seed.ts for what gets inserted.'
    }
    'path' {
        # Touch the resolved path so output is identical to bash version.
        # No trailing newline issues - Write-Host emits [Environment]::NewLine.
        Write-Host $DbPath
    }
    default {
        if ($Subcommand) {
            Write-Host ("✗ Unknown subcommand: $Subcommand") -ForegroundColor Red
        }
        Write-Host 'Usage: scripts/db.ps1 <reset|seed|path>' -ForegroundColor Yellow
        exit 1
    }
}
