#!/usr/bin/env bash
#
# One-shot setup: install all npm dependencies + Playwright Chromium (Bash).
#
# Mirrors `npm run setup` exactly so Linux/macOS users can prepare
# their machine with a single command:
#     bash scripts/setup.sh
# (or equivalently: `npm run setup:sh`).
#
# Steps (sequential, stop on first failure):
#   1. npm install in <repo root>          (no-op today since we removed
#                                           concurrently + kill-port, but
#                                           kept for forward-compat)
#   2. npm install in <repo>/backend
#   3. npm install in <repo>/frontend
#   4. npm install in <repo>/tests
#   5. npx --no-install playwright install chromium  (browser binary)
#
# Each step streams its stdout to the terminal so install logs are
# visible. The script exits non-zero at the first failure so users
# see exactly which step to debug.
#
# idem-POTENT: npm install is a no-op when packages are up-to-date.
# Re-running after the initial setup is harmless and fast.
#
# KEEP IN SYNC with scripts/setup.ps1 and (the legacy) `npm run setup`.
#
set -euo pipefail

if ! command -v npm >/dev/null 2>&1; then
    echo "✗ npm not found on PATH." >&2
    echo "  Install Node.js 20+ from https://nodejs.org/" >&2
    exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "▶ Setting up IrMeetingApp (npm install + Playwright Chromium)"
echo

# run_in LABEL DIR CMD [ARG...]
#   Runs CMD with the given args inside DIR, streams output to terminal,
#   and propagates exit status up via `set -e`. The subshell isolates
#   the `cd` so the calling shell stays where it is.
run_in() {
    local label="$1"
    local dir="$2"
    shift 2
    echo "▶ $label..."
    (
        cd "$dir"
        "$@"
    )
}

run_in "npm install in root     " "$ROOT"          npm install
run_in "npm install in backend  " "$ROOT/backend"  npm install
run_in "npm install in frontend " "$ROOT/frontend" npm install
run_in "npm install in tests    " "$ROOT/tests"    npm install
run_in "Playwright Chromium     " "$ROOT/tests"    npx --no-install playwright install chromium

echo
echo "✓ Setup complete."
echo "  Next:"
echo "    bash scripts/dev.sh          # start backend + frontend (test mode)"
echo "    bash scripts/env-wizard.sh   # create backend/.env for real-mode dev"
