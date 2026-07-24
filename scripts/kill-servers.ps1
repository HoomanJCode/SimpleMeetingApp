<#
.SYNOPSIS
  Cross-platform port killer for stuck dev servers (PowerShell).

.DESCRIPTION
  Frees 3001 (backend) and 5173 (frontend). Safe to run repeatedly -
  no-ops when nothing is bound (prints "was already free" instead of
  erroring). Use this when an interrupted scripts/dev.ps1 left zombie
  node.exe processes holding the ports.

  Implementation uses Get-NetTCPConnection (built-in PS 5.1+ on
  Windows; non-redirectable) + Stop-Process. No shell-out to netstat.

  KEEP IN SYNC with scripts/kill-servers.sh and the (legacy) kill-servers.js.
#>
[CmdletBinding()]
param()

# Don't set $ErrorActionPreference globally - that would silence every
# error in the script, not just the expected-empty Get-NetTCPConnection
# result. Scope the silence to the specific cmdlet via -ErrorAction.
$Ports = @(3001, 5173)

Write-Host '▶ Killing processes on dev ports' -ForegroundColor Cyan

foreach ($port in $Ports) {
    # -ErrorAction SilentlyContinue keeps the empty-result case quiet
    # (port was already free, the happy idempotent path) without
    # masking unrelated errors elsewhere in the script.
    # Force into an array so we can count reliably even when only one
    # connection comes back.
    $conns = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    if ($conns.Count -eq 0) {
        Write-Host "  · $port was already free" -ForegroundColor DarkGray
        continue
    }
    foreach ($c in $conns) {
        $pid_ = $c.OwningProcess
        if (-not $pid_) {
            # No PID = port is held by something we can't identify; this is
            # exceedingly rare on Windows but guard anyway.
            continue
        }
        try {
            Stop-Process -Id $pid_ -Force -ErrorAction Stop
            Write-Host "  ✔ port $port: stopped PID $pid_" -ForegroundColor Green
        } catch {
            # Process already gone (race) - that's fine, port will be free.
            Write-Host "  · port $port: PID $pid_ already gone" -ForegroundColor DarkGray
        }
    }
}

Write-Host '  Done.' -ForegroundColor Cyan
