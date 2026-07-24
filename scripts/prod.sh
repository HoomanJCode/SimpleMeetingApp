#!/usr/bin/env bash
#
# Production-like run (Bash, Linux/macOS). Starts the app with real
# Google OAuth via backend/.env and opens it in your browser.
#
# Workflow:
#   1. Install any missing node_modules in backend/, frontend/, tests/
#      (including Playwright Chromium binary if tests/ was empty).
#   2. If backend/.env is missing AND stdin is a TTY, run the env-wizard
#      prompts inline (JWT_SECRET generator, URL/port/NODE_ENV
#      validators, overwrite guard, 0600 chmod with FAT/SMB fallback).
#      If missing in non-TTY mode, exit 1 with a clear hint.
#   3. Apply windowsCompat env overlay from scripts/test-env.sh to the
#      backend. NO test secrets (real OAuth only).
#   4. Spawn backend and frontend as native background jobs (via
#      process substitution so $! is the npm PID, not a subshell).
#   5. Open http://localhost:5173 in the default browser.
#   6. Clean shutdown via Ctrl+C + trap cleanup.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
ENV_PATH="$BACKEND/.env"
EXAMPLE_PATH="$BACKEND/.env.example"
TEST_ENV="$ROOT/scripts/test-env.sh"

MAX_ATTEMPTS=3

# Ctrl+C / SIGTERM abort cleanly. If we're mid-prompt when it fires,
# we just exit 130 — the orphan process is cleaned up by the next
# user's prod call.
trap 'printf "\n  Aborted.\n"; exit 130' INT TERM

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

# ---- TTY check (used by the env guard below) -------------------------
if [ -t 0 ]; then IS_TTY=1; else IS_TTY=0; fi

# ---- Helpers for the inline env wizard ------------------------------
is_valid_url() { [[ "$1" =~ ^https?://.+\..+ ]]; }
is_valid_port() {
    [[ "$1" =~ ^[0-9]+$ ]] || return 1
    (( $1 > 0 && $1 < 65536 ))
}
is_valid_node_env() {
    case "$1" in development|production|test) return 0 ;; *) return 1 ;; esac
}
min_5_chars()  { (( ${#1} >= 5 )); }
min_32_chars() { (( ${#1} >= 32 )); }

generate_secret() {
    if command -v xxd >/dev/null 2>&1; then
        head -c 32 /dev/urandom | xxd -p -c 256
    elif command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 32
    else
        echo "✗ neither xxd nor openssl installed - cannot generate JWT_SECRET" >&2
        exit 1
    fi
}

# ask QUESTION [DEFAULT [VALIDATOR]]
ask() {
    local question="$1"
    local default_val="${2:-}"
    local validator="${3:-}"
    local prompt answer value attempt=0
    while (( attempt < MAX_ATTEMPTS )); do
        if [ -n "$default_val" ]; then prompt="$question ($default_val): "; else prompt="$question: "; fi
        if ! read -r -p "$prompt" answer; then
            echo
            echo "  ! stdin closed - aborting wizard." >&2
            exit 130
        fi
        if [ -z "$answer" ]; then value="$default_val"; else value="$answer"; fi
        if [ -n "$validator" ]; then
            if $validator "$value"; then printf '%s' "$value"; return 0; fi
            echo "  ✗ validation failed" >&2
            attempt=$((attempt + 1))
            if (( attempt >= MAX_ATTEMPTS )); then
                echo "  (gave up after $MAX_ATTEMPTS attempts; re-run prod to retry)" >&2
                printf '%s' "$value"
                return 0
            fi
        else
            printf '%s' "$value"
            return 0
        fi
    done
}

# ---- backend/.env check + inline wizard -----------------------------
if [ ! -f "$ENV_PATH" ]; then
    if [ "$IS_TTY" = "0" ]; then
        echo "✗ backend/.env not found." >&2
        echo "  Production mode needs a real .env file. This run is non-interactive" >&2
        echo "  (CI / piped), so the wizard cannot run. Two paths:" >&2
        echo
        echo "    1. Create backend/.env yourself by copying from backend/.env.example"
        echo "       and filling in real Google OAuth credentials."
        echo "    2. Run scripts/prod.sh from an interactive shell so the inline"
        echo "       env wizard can prompt for the values." >&2
        exit 1
    fi
    if [ ! -f "$EXAMPLE_PATH" ]; then
        echo "  ✗ backend/.env.example not found; aborting." >&2
        exit 1
    fi

    echo "▶ backend/.env not found - launching inline .env setup."
    echo
    echo "  Production mode needs real values (Google OAuth credentials, JWT_SECRET, etc)."
    echo "  Press <Enter> to accept any default. JWT_SECRET can be auto-generated."

    if [ -f "$ENV_PATH" ]; then
        echo "  · backend/.env already exists."
        overwrite=$(ask "  Overwrite? (y/N)" "N")
        case "$overwrite" in
            [Yy]|[Yy][Ee][Ss]) : ;;
            *)
                echo "  Aborted. Existing .env left untouched."
                exit 0
                ;;
        esac
        echo
        echo "  Heads-up: if you regenerate JWT_SECRET, every existing user"
        echo "  session becomes invalid (token signatures change)."
        echo
    fi

    secret_mode=$(ask "JWT_SECRET (required, min 32 chars): (g)enerate or (e)nter" "g")
    case "$secret_mode" in
        [Gg])
            JWT_SECRET="$(generate_secret)"
            echo "  ✓ Generated JWT_SECRET (${#JWT_SECRET} chars): ${JWT_SECRET:0:8}…"
            ;;
        [Ee])
            JWT_SECRET=$(ask "  Enter your JWT_SECRET (≥ 32 chars)" "" min_32_chars)
            ;;
        *)
            echo "  ✗ unknown mode: $secret_mode" >&2
            exit 1
            ;;
    esac

    NODE_ENV=$(ask "NODE_ENV" "development" is_valid_node_env)
    PORT=$(ask "PORT" "3001" is_valid_port)
    echo "  Tip: HOST=127.0.0.1 avoids a Windows IPv4/IPv6 gotcha; works on macOS/Linux too."
    HOST=$(ask "HOST" "127.0.0.1")

    echo
    echo "  Google OAuth credentials (create at https://console.cloud.google.com/"
    echo "  -> APIs & Services -> Credentials -> Create OAuth client ID -> Web app)."
    echo "  Authorized redirect URI must match whatever you give for GOOGLE_REDIRECT_URI below."
    echo

    GOOGLE_CLIENT_ID=$(ask "GOOGLE_CLIENT_ID (required)" "" min_5_chars)
    GOOGLE_CLIENT_SECRET=$(ask "GOOGLE_CLIENT_SECRET (required)" "" min_5_chars)
    GOOGLE_REDIRECT_URI=$(ask "GOOGLE_REDIRECT_URI" "http://localhost:3001/api/auth/google/callback" is_valid_url)
    FRONTEND_URL=$(ask "FRONTEND_URL" "http://localhost:5173" is_valid_url)
    JWT_EXPIRATION=$(ask "JWT_EXPIRATION (access token TTL)" "15m")
    REFRESH_TOKEN_EXPIRATION=$(ask "REFRESH_TOKEN_EXPIRATION (refresh token TTL)" "30d")
    DATABASE_PATH=$(ask "DATABASE_PATH" "./data/irmeeting.db")

    # Post-loop sanity check
    missing=()
    [ -z "$GOOGLE_CLIENT_ID"     ] && missing+=("GOOGLE_CLIENT_ID")
    [ -z "$GOOGLE_CLIENT_SECRET" ] && missing+=("GOOGLE_CLIENT_SECRET")
    [ -z "$JWT_SECRET"           ] && missing+=("JWT_SECRET")
    if [ ${#missing[@]} -gt 0 ]; then
        echo
        echo "  ✗ Required fields missing: ${missing[*]}" >&2
        echo "    Re-run: scripts/prod.sh" >&2
        exit 1
    fi

    # Compose and write. Try 0600 first (POSIX); fall back to plain
    # write on filesystems that reject the mode (FAT/SMB share).
    header='# Generated by `scripts/prod.sh` on '"$(date -u +'%Y-%m-%dT%H:%M:%S.%3NZ' 2>/dev/null || date -u +'%Y-%m-%dT%H:%M:%SZ')"
    header="${header}"$'\n# Edit freely; changes take effect on the next `scripts/prod.sh`.'

    body=$(
        printf '%s\n' '# Server'
        printf 'NODE_ENV=%s\n' "$NODE_ENV"
        printf 'PORT=%s\n' "$PORT"
        printf 'HOST=%s\n' "$HOST"
        printf '\n'
        printf '%s\n' '# Google OAuth'
        printf 'GOOGLE_CLIENT_ID=%s\n' "$GOOGLE_CLIENT_ID"
        printf 'GOOGLE_CLIENT_SECRET=%s\n' "$GOOGLE_CLIENT_SECRET"
        printf 'GOOGLE_REDIRECT_URI=%s\n' "$GOOGLE_REDIRECT_URI"
        printf '\n'
        printf '%s\n' '# JWT'
        printf 'JWT_SECRET=%s\n' "$JWT_SECRET"
        printf 'JWT_EXPIRATION=%s\n' "$JWT_EXPIRATION"
        printf 'REFRESH_TOKEN_EXPIRATION=%s\n' "$REFRESH_TOKEN_EXPIRATION"
        printf '\n'
        printf '%s\n' '# Frontend URL (for CORS and redirects)'
        printf 'FRONTEND_URL=%s\n' "$FRONTEND_URL"
        printf '\n'
        printf '%s\n' '# Database'
        printf 'DATABASE_PATH=%s\n' "$DATABASE_PATH"
        printf '\n'
    )

    content="${header}"$'\n'"${body}"

    wrote_perms=0
    if printf '%s' "$content" > "$ENV_PATH" 2>/dev/null && chmod 600 "$ENV_PATH" 2>/dev/null; then
        wrote_perms=1
    else
        if ! printf '%s' "$content" > "$ENV_PATH" 2>/dev/null; then
            echo "  ✗ failed to write backend/.env" >&2
            exit 1
        fi
    fi

    echo
    line_count=$(printf '%s' "$content" | wc -l | tr -d ' ')
    echo "✓ Wrote $line_count lines to backend/.env"
    if [ "$wrote_perms" = "1" ]; then
        echo "  File permissions set to 0600 (owner-only)."
    else
        echo "  ⚠ Could not set 0600 permissions (likely FAT/SMB share). Skipped." >&2
    fi
    echo
fi

# ---- Load test env (we only need WindowsCompat for the backend overlay)
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
echo "▶ Starting in PROD mode (real Google OAuth from backend/.env, test routes disabled)"
echo

# In real mode, `backend_env_prefix real` omits test secrets so the
# backend reads backend/.env for OAuth values.
env $(backend_env_prefix real) \
    npm --prefix "$BACKEND" run dev \
    &> >(sed 's/^/[backend] /') &
BACKEND_PID=$!

npm --prefix "$FRONTEND" run dev -- --host 127.0.0.1 --port 5173 \
    &> >(sed 's/^/[frontend] /') &
FRONTEND_PID=$!

sleep 3
echo "▶ Opening http://localhost:5173 in your default browser..."
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:5173" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    open "http://localhost:5173" >/dev/null 2>&1 &
else
    echo "  (no xdg-open or open found on PATH - open http://localhost:5173 manually)" >&2
fi

wait -n || true
wait || true
