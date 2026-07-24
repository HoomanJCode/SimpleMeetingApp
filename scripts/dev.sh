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
#      process substitution so $! is the npm PID, not a subshell).
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
    [ -n "$BACKEND_PID"  ] && kill -TERM "$BACKEND_PID"  2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    sleep 0.3
    [ -n "$BACKEND_PID"  ] && kill -KILL "$BACKEND_PID"  2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill -KILL "$FRONTEND_PID" 2>/dev/null || true
    for port in 3001 5173; do
        if command -v lsof >/dev/null 2>&1; then
            lsof -ti:"$port" 2>/dev/null | xargs -r kill -KILL 2>/dev/null || true
        fi
    done
    exit "$exit_code"
}
trap cleanup INT TERM

echo
cat <<'TEST_BANNER'
┌───────────────────────────────────────────────────────────────┐
│  TEST MODE - dummy OAuth, no Google interaction required       │
│                                                                 │
│  · Auth: backend exposes POST /api/test/login (dev-only).       │
│    Any {id,email,name} body mints a valid JWT locally.          │
│  · The frontend's 'Sign in with Google' button is wired up      │
│    identically; the only thing that changes between TEST and    │
│    PROD is whether the backend hits Google or mocks the reply.  │
│  · Enabled via ENABLE_TEST_ROUTES=1 from scripts/test-env.sh.   │
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
# Process substitution `&> >(sed ...)` keeps $! as the actual npm PID
# (not a subshell wrapper), so SIGTERM via $BACKEND_PID targets npm
# directly and SIGPIPE handles the intermediate sed.
env $(backend_env_prefix test) \
    npm --prefix "$BACKEND" run dev \
    &> >(sed 's/^/[backend] /') &
BACKEND_PID=$!

# ---- Spawn frontend (no env overlay — clean parent env is correct) ---
npm --prefix "$FRONTEND" run dev -- --host 127.0.0.1 --port 5173 \
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
