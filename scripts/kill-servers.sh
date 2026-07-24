#!/usr/bin/env bash
#
# Cross-platform port killer for stuck dev servers (Bash).
#
# Frees 3001 (backend) and 5173 (frontend). Safe to run repeatedly -
# no-ops when nothing is bound (prints "was already free" instead of
# erroring). Use this when an interrupted scripts/dev.sh left zombie
# node processes holding the ports.
#
# Tries lsof first (most common on macOS + most Linux distros), falls
# back to fuser (busybox/alpine), then to ss (modern iproute2). If
# none of those are installed we bail out with a clear hint instead
# of relying on a half-fallback.
#
# KEEP IN SYNC with scripts/kill-servers.ps1 and the (legacy) kill-servers.js.
#
set -euo pipefail

echo "▶ Killing processes on dev ports"

free_port() {
    local port="$1"
    local pids=""

    if command -v lsof >/dev/null 2>&1; then
        pids="$(lsof -ti:"$port" 2>/dev/null || true)"
    elif command -v fuser >/dev/null 2>&1; then
        # fuser prints "<pid> <pid> ..." to stdout (one space-separated
        # line). Pipe through tr to normalize.
        pids="$(fuser "$port"/tcp 2>/dev/null | tr -d ' ' || true)"
    elif command -v ss >/dev/null 2>&1; then
        # -tlnpH = tcp listening, no service names, no header. Extract
        # pid=NNN fragments; newer ss binds the fd's pid to the
        # connection which is exactly what we need.
        pids="$(ss -tlnpH "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | tr '\n' ' ' || true)"
    else
        echo "  ✗ no port-killing tool found. Install one of: lsof, fuser (psmisc), ss (iproute2)"
        return 1
    fi

    if [ -z "${pids// }" ]; then
        echo "  · $port was already free"
        return 0
    fi

    # Polite SIGTERM first; if the process ignores it, force after a
    # brief grace period. tsx-watch / vite both handle SIGTERM cleanly
    # so we rarely need the KILL.
    # shellcheck disable=SC2086  # we WANT word-splitting on $pids
    kill -TERM $pids 2>/dev/null || true
    sleep 0.3
    # shellcheck disable=SC2086
    kill -KILL $pids 2>/dev/null || true
    echo "  ✔ freed $port (pids: $pids)"
}

free_port 3001
free_port 5173

echo "  Done."
