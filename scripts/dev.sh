#!/usr/bin/env bash
#
# Cross-platform dev orchestrator (Bash, Linux/macOS).
#
# Starts backend + frontend natively as concurrent background jobs.
#
# Default mode = TEST (no .env needed):
#   - Backend runs with dummy OAuth + JWT_SECRET + ENABLE_TEST_ROUTES=1.
#   - Frontend binds to 127.0.0.1:5173.
#
# Flags:
#   --be         only the backend
#   --fe         only the frontend
#   --real       run the backend with backend/.env (no test routes)
#   --no-wizard  skip auto-wizard in --real mode (for deploy scripts)
#
# In --real mode, auto-launches env-wizard if backend/.env is missing
# AND stdin is a TTY.
#
# Concurrency model:
#   We use process substitution `&> >(sed 's/^/.../')` rather than the
#   `( ... | sed ) &` subshell-pipe pattern. With process substitution,
#   $! is the actual `npm` PID (not a subshell wrapper), so SIGTERM
#   via $BACKEND_PID targets npm directly. The intermediate sed gets
#   SIGPIPE when npm exits and dies on its own. This avoids the classic
#   dev.js comment about Ctrl+C leaving zombie node.exe processes.
#
# On Ctrl+C / SIGTERM, cleanup runs:
#   - SIGTERM both background npm PIDs (each propagates to its node tree).
#   - 300ms grace period for SIGINT-handling children (tsx watch, vite).
#   - SIGKILL any stragglers by the saved PIDs.
#   - Belt + suspenders: lsof-scrub 3001/5173 for any orphans.
#
# KEEP IN SYNC with scripts/dev.ps1 (Windows-only).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
ENV_PATH="$BACKEND/.env"
WIZARD="$ROOT/scripts/env-wizard.sh"
TEST_ENV="$ROOT/scripts/test-env.sh"

# ---- arg parsing --------------------------------------------------------
ONLY_BE=0
ONLY_FE=0
REAL=0
NO_WIZARD=0
for arg in "$@"; do
    case "$arg" in
        --be)        ONLY_BE=1 ;;
        --fe)        ONLY_FE=1 ;;
        --real)      REAL=1 ;;
        --no-wizard) NO_WIZARD=1 ;;
        *)           echo "✗ unknown arg: $arg" >&2; exit 1 ;;
    esac
done

if [ "$ONLY_BE" = "1" ] && [ "$ONLY_FE" = "1" ]; then
    echo "✗ --be and --fe cannot be combined" >&2
    exit 1
fi

if [ -t 0 ]; then IS_TTY=1; else IS_TTY=0; fi

# Load test-env values (WINDOWS_COMPAT_*, TEST_SECRET_*, backend_env_prefix).
. "$TEST_ENV"

# ---- env-file guard for --real mode ------------------------------------
ensure_env_for_real_mode() {
    [ -f "$ENV_PATH" ] && return 0
    if [ "$NO_WIZARD" = "1" ]; then
        echo "✗ backend/.env not found and --no-wizard was passed." >&2
        echo "  Either create backend/.env manually (copy from backend/.env.example)" >&2
        echo "  or drop --no-wizard to let the wizard run." >&2
        exit 1
    fi
    if [ "$IS_TTY" = "0" ]; then
        echo "✗ backend/.env not found." >&2
        echo "  This run is non-interactive (CI or piped), so the wizard cannot run." >&2
        echo "  Create backend/.env yourself, then re-run. Two paths:" >&2
        echo
        echo "    1. Fast manual route (e.g. Docker secret, k8s, deploy script):"
        echo "         Create backend/.env by copying from backend/.env.example,"
        echo "         then fill in your real credentials."
        echo
        echo "    2. Run the wizard in a real terminal:"
        echo "         scripts/env-wizard.sh"
        echo "         scripts/dev.sh --real"
        echo
        echo "    (Tip: pass --no-wizard if your deploy script will create .env before this run.)" >&2
        exit 1
    fi
    echo "▶ backend/.env not found - launching env wizard first."
    echo
    bash "$WIZARD" || { echo "✗ wizard exited with status $?" >&2; exit 1; }
    if [ ! -f "$ENV_PATH" ]; then
        echo "✗ wizard did not create backend/.env" >&2
        exit 1
    fi
}

if [ "$REAL" = "1" ] && [ "$ONLY_FE" = "0" ]; then
    ensure_env_for_real_mode
fi

mode_label() {
    if [ "$REAL" = "1" ]; then
        echo "REAL (backend uses .env, test routes disabled, Windows env still pinned)"
    else
        echo "TEST (ENABLE_TEST_ROUTES=1, dummy OAuth/JWT, Windows env pinned)"
    fi
}

# ---- background process tracking ---------------------------------------
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
    # Belt + suspenders: scrub anything still holding the dev ports.
    # (tsx watch / vite spawn child node processes; if a parent died
    # mid-start, one of them can leak the port.)
    for port in 3001 5173; do
        if command -v lsof >/dev/null 2>&1; then
            lsof -ti:"$port" 2>/dev/null | xargs -r kill -KILL 2>/dev/null || true
        fi
    done
    exit "$exit_code"
}
trap cleanup INT TERM EXIT

# ---- header -------------------------------------------------------------
echo
echo "▶ Starting in $(mode_label) mode"
echo

# ---- spawn backend ------------------------------------------------------
# `&> >(sed ...)` writes BOTH stdout AND stderr through the process
# substitution, so npm's child-process stderr (Vite/tsx error frames)
# is prefixed just like its stdout. net result: $! is the npm PID.
# Cross-check: `type -a env` on macOS and Linux both confirm `env`
# accepts KEY=VAL pairs and runs a single command afterwards.
if [ "$ONLY_FE" = "0" ]; then
    if [ "$REAL" = "1" ]; then
        env $(backend_env_prefix real) \
            npm --prefix "$BACKEND" run dev \
            &> >(sed 's/^/[backend] /') &
        BACKEND_PID=$!
    else
        env $(backend_env_prefix test) \
            npm --prefix "$BACKEND" run dev \
            &> >(sed 's/^/[backend] /') &
        BACKEND_PID=$!
    fi
fi

# ---- spawn frontend -----------------------------------------------------
# Frontend doesn't need backend's secrets; inheriting the parent env
# cleanly (PATH, HOME, npm_config_*) is correct here.
if [ "$ONLY_BE" = "0" ]; then
    npm --prefix "$FRONTEND" run dev -- --host 127.0.0.1 --port 5173 \
        &> >(sed 's/^/[frontend] /') &
    FRONTEND_PID=$!
fi

if [ -z "$BACKEND_PID" ] && [ -z "$FRONTEND_PID" ]; then
    echo "✗ nothing to start (you asked for both --be and --fe which is impossible)" >&2
    exit 1
fi

# ---- wait ---------------------------------------------------------------
# `wait -n` returns once ANY background job exits, with that job's status.
# After that we still let the other child wind down naturally
# (it received SIGINT via the shared terminal) before falling through to
# the EXIT trap, which calls cleanup() and exits.
WAIT_CODE=0
wait -n || WAIT_CODE=$?

# Wait for the survivor so its output isn't lost mid-print. We don't
# promote WAIT_CODE to its exit status because cleanup is about to run.
wait || true

exit "$WAIT_CODE"
