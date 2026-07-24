#!/usr/bin/env bash
#
# Interactive wizard for creating backend/.env (Bash).
#
# Use case: scripts/dev.sh works out of the box in test mode (no .env
# needed). Run this wizard when you want to use scripts/dev.sh --real -
# real Google OAuth sign-in instead of the dummy test login.
#
# What it does:
#   - Walks through each variable from backend/.env.example, with defaults
#   - Generates a strong 64-hex-char JWT_SECRET if you press 'g'
#   - Validates required fields and URL formats inline
#   - Refuses to overwrite an existing backend/.env without confirmation
#   - Detects Ctrl+C / EOF on stdin via trap and exits cleanly instead
#     of writing a malformed file
#   - Tries to chmod 0600 on the new .env (POSIX only); retries without
#     chmod if the FS rejects the mode (Windows / SMB share / etc).
#
# KEEP IN SYNC with scripts/env-wizard.ps1 and the (legacy) env-wizard.js.
#
set -euo pipefail

MAX_ATTEMPTS=3

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
ENV_PATH="$BACKEND/.env"
EXAMPLE_PATH="$BACKEND/.env.example"

# Ctrl+C / SIGTERM / EXIT all abort cleanly without writing a partial file.
trap 'printf "\n  Aborted. No file was written.\n"; exit 130' INT TERM

is_valid_url() {
    # Accept http(s) URLs with at least one dot. Not as rigorous as the
    # JS URL parser but good enough to catch the obvious mistypes.
    [[ "$1" =~ ^https?://.+\..+ ]]
}

is_valid_port() {
    [[ "$1" =~ ^[0-9]+$ ]] || return 1
    (( $1 > 0 && $1 < 65536 ))
}

is_valid_node_env() {
    case "$1" in
        development|production|test) return 0 ;;
        *) return 1 ;;
    esac
}

min_5_chars()  { (( ${#1} >= 5 )); }
min_32_chars() { (( ${#1} >= 32 )); }

generate_secret() {
    # 64 hex chars via /dev/urandom | xxd; falls back to openssl if xxd
    # is unavailable (e.g. some minimal containers / Alpine without xxd).
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
# Prints the user's answer (or DEFAULT on empty input) on stdout. Retries
# up to MAX_ATTEMPTS if VALIDATOR returns non-zero. Mirrors the .ps1 loop.
ask() {
    local question="$1"
    local default_val="${2:-}"
    local validator="${3:-}"
    local prompt answer value attempt=0

    while (( attempt < MAX_ATTEMPTS )); do
        if [ -n "$default_val" ]; then
            prompt="$question ($default_val): "
        else
            prompt="$question: "
        fi
        if ! read -r -p "$prompt" answer; then
            # EOF on stdin (Ctrl+D / piped stdin) -> abort cleanly.
            echo
            echo "  ! stdin closed - aborting wizard." >&2
            exit 130
        fi
        if [ -z "$answer" ]; then
            value="$default_val"
        else
            value="$answer"
        fi

        if [ -n "$validator" ]; then
            if $validator "$value"; then
                printf '%s' "$value"
                return 0
            fi
            echo "  ✗ validation failed" >&2
            attempt=$((attempt + 1))
            if (( attempt >= MAX_ATTEMPTS )); then
                echo "  (gave up after $MAX_ATTEMPTS attempts; re-run to retry)" >&2
                printf '%s' "$value"
                return 0
            fi
        else
            printf '%s' "$value"
            return 0
        fi
    done
}

# ----------------------------- main flow ---------------------------------

echo "▶ IrMeetingApp .env wizard"
echo
echo "  Creates backend/.env so you can run scripts/dev.sh --real"
echo "  (real Google OAuth, test routes disabled)."
echo
echo "  For day-to-day dev you can skip this entirely - scripts/dev.sh"
echo "  works in test mode without any .env file."
echo

if [ ! -f "$EXAMPLE_PATH" ]; then
    echo "  ✗ backend/.env.example not found; aborting."
    exit 1
fi

# Overwrite guard - never destroy a real .env silently.
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

# --- JWT_SECRET first, with a generator shortcut -------------------------
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

# Default HOST to 127.0.0.1 to dodge the Windows IPv4/IPv6 gotcha.
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

# --- Post-loop sanity check ----------------------------------------------
missing=()
[ -z "$GOOGLE_CLIENT_ID"     ] && missing+=("GOOGLE_CLIENT_ID")
[ -z "$GOOGLE_CLIENT_SECRET" ] && missing+=("GOOGLE_CLIENT_SECRET")
[ -z "$JWT_SECRET"           ] && missing+=("JWT_SECRET")
if [ ${#missing[@]} -gt 0 ]; then
    echo
    echo "  ✗ Required fields missing: ${missing[*]}" >&2
    echo "    Re-run: scripts/env-wizard.sh" >&2
    exit 1
fi

# --- Compose & write -----------------------------------------------------
# Note: the JS source uses literal backticks around script names in the
# generated header. We mirror that exactly so the file content is
# byte-identical across platforms.
header='# Generated by `scripts/env-wizard.sh` on '"$(date -u +'%Y-%m-%dT%H:%M:%S.%3NZ' 2>/dev/null || date -u +'%Y-%m-%dT%H:%M:%SZ')"
header="${header}"$'\n# Edit freely; changes take effect on the next `scripts/dev.sh --real`.'

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

# Try posix 0600 first; fall back to plain write on filesystems that
# reject the mode (Windows / SMB share / FAT). If the backend has the
# file open under Windows we get EBUSY -> retry without mode.
wrote_perms=0
if printf '%s' "$content" > "$ENV_PATH" 2>/dev/null && chmod 600 "$ENV_PATH" 2>/dev/null; then
    wrote_perms=1
else
    err=$?
    if ! printf '%s' "$content" > "$ENV_PATH" 2>/dev/null; then
        echo "  ✗ failed to write $ENV_PATH (chmod rejected by filesystem, then write also failed): code $err" >&2
        exit 1
    fi
fi

echo
line_count=$(printf '%s' "$content" | wc -l | tr -d ' ')
echo "✓ Wrote $line_count lines to backend/.env"
if [ "$wrote_perms" = "1" ]; then
    echo "  File permissions set to 0600 (owner-only)."
else
    # stderr so a stdout-redirect doesn't silently drop this hint
    echo "  ⚠ Could not set 0600 permissions (likely FAT/SMB share). Skipped." >&2
fi
echo
echo "  Next:"
echo "    scripts/dev.sh --real    # start backend + frontend with these credentials"
echo "    scripts/dev.sh          # day-to-day dev (test mode, ignores this file)"
