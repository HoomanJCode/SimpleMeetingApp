#!/usr/bin/env bash
#
# Dev script (Bash, Linux/macOS). One command to start the app in
# test mode in your browser.
#
# Workflow:
#   1. Check node_modules in backend/, frontend/, tests/. Install any
#      missing (including Playwright Chromium binary if tests/ was empty).
#   2. Apply the windowsCompat + testSecrets env overlay from
#      scripts/test-env.sh to the backend (via backend_env_prefix test).
#   3. Spawn backend and frontend as native background jobs (via
#      process substitution for direct, flicker-free output piping).
#   4. Open http://localhost:5173 in the default browser (xdg-open /
#      open with a manual-open fallback if neither is available).
#   5. Wait; Ctrl+C cleanly terminates both via SIGTERM->SIGKILL on
#      the saved PIDs, plus a port-scrub belt-and-suspenders.
#
# Test mode = no .env needed. For real-Google-OAuth mode, run
# scripts/prod.sh instead.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
TEST_ENV="$ROOT/scripts/test-env.sh"

# ---- Install-if-missing ----------------------------------------------
missing=()
for sub in backend frontend tests; do
    [ ! -d "$ROOT/$sub/node_modules" ] && missing+=("$sub")
done
if [ ${#missing[@]} -gt 0 ]; then
    echo "▶ Installing missing dependencies: ${missing[*]}" >&2
    for sub in "${missing[@]}"; do
        echo "  npm install in $sub..."
        (
            cd "$ROOT/$sub"
            npm install --no-audit --no-fund
        )
    done
    # If tests/ was missing, also install the browser binary so the
    # E2E suite (and the user's first npm run test:e2e) work.
    for sub in "${missing[@]}"; do
        if [ "$sub" = "tests" ]; then
            echo "▶ Installing Playwright Chromium (browser binary)..."
            (
                cd "$ROOT/tests"
                npx --no-install playwright install chromium
            )
        fi
    done
fi

# ---- Load test env overlay -------------------------------------------
. "$TEST_ENV"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    local exit_code=$?
    echo
    echo "▶ Stopping servers..."
    # Cross-platform TERM-grace-KILL on tracked PIDs. Linux + macOS
    # this works cleanly. Windows Git Bash uses taskkill under the hood
    # (see kill_tree). The tracked-PID path is best-effort -- the
    # port_scrub() loop below is the REAL cleanup, because tracking
    # signal propagation across MSYS / native Windows process
    # boundaries is unreliable.
    [ -n "$BACKEND_PID"  ] && kill_tree "$BACKEND_PID"
    [ -n "$FRONTEND_PID" ] && kill_tree "$FRONTEND_PID"
    sleep 0.5
    # Belt-and-suspenders port-scrub. THIS is what reliably frees
    # 3001 + 5173 on Windows Git Bash (verified: netstat + taskkill
    # works where tracked-PID signal propagation doesn't always cross
    # the MSYS boundary). On Linux / macOS, lsof + kill.
    for port in 3001 5173; do
        port_scrub "$port"
    done
    # Final orphan sweep: any tsx / vite subprocess whose cmdline
    # names our project paths.
    pkill -KILL -f "$ROOT/backend.*tsx"   2>/dev/null || true
    pkill -KILL -f "$ROOT/frontend.*vite" 2>/dev/null || true
    pkill -KILL -f "npm.*$ROOT/backend"  2>/dev/null || true
    pkill -KILL -f "npm.*$ROOT/frontend" 2>/dev/null || true
    # Quick port-answer diagnostic. If a port is still listening, print a
    # hint but DO NOT escalate -- killing node.exe globally (formerly
    # `taskkill //IM node.exe //F //T`) breaks the user's terminal, VS
    # Code, and every other Node tool they have running. TIME_WAIT
    # connections clear on their own within ~2 min; if the port is truly
    # still bound, the user can re-run the script and port_scrub will
    # handle it on the next pass.
    if command -v curl >/dev/null 2>&1; then
        for port in 3001 5173; do
            if curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$port/" >/dev/null 2>&1; then
                echo "  (port $port still answering -- may be TIME_WAIT; will clear on re-run)" >&2
            fi
        done
    fi
    exit "$exit_code"
}

# kill_tree PID -- graceful TERM+grace+KILL chain on tracked processes.
# Best-effort: signal propagation across MSYS / native Windows isn't
# always reliable, so port_scrub() below is the real cleanup. This
# helper just gives us a clean CODEPATH for the polite-shutdown attempt.
kill_tree() {
    local pid="$1"
    [ -z "$pid" ] && return 0
    if command -v taskkill.exe >/dev/null 2>&1; then
        taskkill.exe //F //T //PID "$pid" 2>/dev/null || true
    elif command -v taskkill >/dev/null 2>&1; then
        taskkill //F //T //PID "$pid" 2>/dev/null || true
    else
        kill -TERM "$pid" 2>/dev/null || true
        sleep 0.3
        kill -KILL "$pid" 2>/dev/null || true
    fi
}

# port_scrub PORT -- kill whatever process is listening on PORT. This
# is the RELIABLE cross-platform cleanup: instead of tracking parent
# --> child signal propagation (which fails across MSYS <> native
# Windows boundaries), we query the kernel directly for whoever
# actually holds the port, then kill it with the right tool.
# - Linux: lsof -ti:PORT -> kill -KILL (or fuser, or ss fallback
#   chain)
# - macOS: lsof -ti:PORT -> kill -KILL
# - Windows Git Bash: netstat -ano -> taskkill.exe //F //T (per PID)
#   (lsof is uncommon on Windows; netstat is universal)
# PID regex notes:
#   - `[1-9][0-9]*$` excludes PID 0 -- netstat sometimes surfaces a
#     row whose last column is 0 (header artifacts or a Windows
#     system row). `taskkill //F //T //PID 0` returns 'Access is
#     denied' and would abort cleanup() under `set -e`.
#   - The `sort -u` dedup is important -- without it, multiple
#     IPv4/IPv6 listener rows on the same port would each retry.
port_scrub() {
    local port="$1"
    # Linux / macOS path (lsof).
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti:"$port" 2>/dev/null | xargs -r kill -KILL 2>/dev/null || true
    fi
    # Windows path (netstat + taskkill). MSYS netstat prints listening
    # PIDs as the last column; awk pulls them out, grep restricts to
    # real PIDs (1+), sort -u dedups, then we iterate WITHIN THE
    # CURRENT SHELL (no pipe subshell!) so the loop survives.
    if command -v netstat >/dev/null 2>&1 && command -v taskkill.exe >/dev/null 2>&1; then
        local port_pids
        port_pids="$(netstat -ano 2>/dev/null \
            | grep ":$port " \
            | awk '{print $NF}' \
            | grep -E '^[1-9][0-9]*$' \
            | sort -u \
            | tr '\n' ' ')"
        local pid
        for pid in $port_pids; do
            [ -n "$pid" ] || continue
            # Don't fully silence taskkill stderr -- if it actually
            # fails we want to know why in /tmp/devsh*.log.
            taskkill.exe //F //T //PID "$pid" >/dev/null 2>&1 \
                || echo "  [port_scrub $port] taskkill //PID $pid returned $?" >&2
        done
    fi
    return 0
}
trap cleanup INT TERM

echo
cat <<'TEST_BANNER'
┌───────────────────────────────────────────────────────────────┐
│  TEST MODE - email/password auth, no Google OAuth required       │
│                                                                 │
│  * Auth: Sign In with email + password. Backend auto-registers    │
│    new users on first login. No Google account needed.            │
│  * Test routes (/api/test/*) enabled for E2E tests.               │
│  * Enabled via ENABLE_TEST_ROUTES=1 from scripts/test-env.sh.     │
│                                                                 │
│  Want REAL Google OAuth? Ctrl+C and run instead:                │
│      scripts/prod.sh             (Linux / macOS, Bash 4+)        │
│      scripts/prod.ps1            (Windows, PowerShell 5.1+)     │
│                                                                 │
│  First time with real Google? See documents/google-oauth-setup.md│
│  for the step-by-step Cloud Console walkthrough.                │
└───────────────────────────────────────────────────────────────┘
TEST_BANNER
echo

# ---- Spawn backend ----------------------------------------------------
# Process substitution `&> >(sed ...)` pipes output directly to the
# terminal without intermediate files or polling -- this avoids the
# visual flickering that `tail -F` + log-file buffering causes on
# Windows Git Bash. The `sed` process dies on SIGPIPE when the npm
# process exits; port_scrub + kill_tree handle cleanup reliably
# regardless of which PID $! captures.
env $(backend_env_prefix test) \
    npm --prefix "$BACKEND" run dev \
    &> >(sed 's/^/[backend] /') &
BACKEND_PID=$!

# ---- Spawn frontend (no env overlay -- clean parent env is correct) ---
# VITE_AUTH_METHOD tells the frontend which auth mode to use without
# needing a backend API call (which would fail on cold start).
VITE_AUTH_METHOD=userpass npm --prefix "$FRONTEND" run dev -- --host 127.0.0.1 --port 5173 \
    &> >(sed 's/^/[frontend] /') &
FRONTEND_PID=$!

# ---- Open browser once the frontend has had time to bind --------------
sleep 3
echo "▶ Opening http://localhost:5173 in your default browser..."
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:5173" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then  # macOS `open`
    open "http://localhost:5173" >/dev/null 2>&1 &
else
    echo "  (no xdg-open or open found on PATH - open http://localhost:5173 manually)" >&2
fi

# ---- Wait ------------------------------------------------------------
# Capture exit codes without `|| true` (which would silently overwrite
# $? to 0 and mask a child crash as a success to CI). Wait twice: once
# for whichever child exits first, then for the second.
wait -n; first=$?
wait;     last=$?
if [ "$first" -ne 0 ]; then exit "$first"; fi
exit "$last"
