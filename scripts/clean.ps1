<#
.SYNOPSIS
  Clean build + test artifacts (PowerShell).

.DESCRIPTION
  Removes:
    - backend/dist           (tsc output)
    - frontend/dist          (vite build output)
    - tests/test-results     (playwright raw output)
    - tests/playwright-report (playwright HTML report)

  Does NOT touch:
    - node_modules (manual rm -r / Remove-Item)
    - backend/data (SQLite DB - use scripts/db.ps1 reset instead)
#>
[CmdletBinding()]
param()

# -ErrorActionPreference SilentlyContinue so we can probe Test-Path
# without aborting on the (impossible but cautious) case of an
# in-flight deletion racing us.
$ErrorActionPreference = 'SilentlyContinue'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')

# (Dir, Sub) pairs - kept identical to the .js and .sh scripts so
# behaviour never drifts across platforms.
$Targets = @(
    @{ Dir = 'backend';  Sub = 'dist' },
    @{ Dir = 'frontend'; Sub = 'dist' },
    @{ Dir = 'tests';    Sub = 'test-results' },
    @{ Dir = 'tests';    Sub = 'playwright-report' }
)

function Get-CwdRelative {
    param([Parameter(Mandatory)][string]$Full)
    $cwd = (Get-Location).Path
    if ($Full.Length -gt $cwd.Length -and
        $Full.Substring(0, $cwd.Length).Equals($cwd, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $Full.Substring($cwd.Length).TrimStart('\', '/')
    }
    return $Full
}

Write-Host '▶ Cleaning build + test artifacts' -ForegroundColor Cyan

foreach ($t in $Targets) {
    $full = Join-Path (Join-Path $Root $t.Dir) $t.Sub
    if (Test-Path $full) {
        Remove-Item -Recurse -Force $full
        Write-Host ('  ✔ removed ' + (Get-CwdRelative $full)) -ForegroundColor Green
    } else {
        Write-Host ('  · skipped ' + $t.Dir + '/' + $t.Sub + ' (does not exist)') -ForegroundColor DarkGray
    }
}

Write-Host '  Done.' -ForegroundColor Cyan
