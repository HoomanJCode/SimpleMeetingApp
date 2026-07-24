#!/usr/bin/env bash
#
# SQLite database helper (Bash).
#
# Subcommands:
#   reset   Delete the DB file (and any WAL/SHM sidecars). The next time the
#           backend starts, it auto-runs migrations + the first-boot sample
#           seed on a fresh file. If the backend is currently running, stop
#           it first (scripts/kill-servers.sh).
#
#   seed    Sample-data seeding happens automatically the first time the
#           backend boots against an empty DB (see backend/src/db/seed.ts).
#           To reseed from scratch:
#             scripts/kill-servers.sh
#             scripts/db.sh reset
#             scripts/dev.sh
#
#   path    Print the absolute path of the SQLite file (matches
#           backend/src/db/connection.ts).
#
# The DB lives at backend/data/irmeeting.db. The backend creates that
# directory on first start if it doesn't exist.
#
# KEEP IN SYNC with scripts/db.sh and the (legacy) scripts/db.js.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
DATA_DIR="$BACKEND/data"
DB_PATH="$DATA_DIR/irmeeting.db"

rel() {
    # Print relative-to-cwd paths so output is short and legible.
    # Same behaviour as scripts/db.js.
    local p="$1"
    if [[ "$p" == "$PWD/"* ]]; then
        printf '%s\n' "${p#$PWD/}"
    else
        printf '%s\n' "$p"
    fi
}

rm_db_file() {
    local p="$1"
    if [ ! -e "$p" ]; then
        echo "  · $(rel "$p") did not exist"
        return 0
    fi
    if ! rm "$p" 2>/dev/null; then
        # Only treat EBUSY/EPERM as the "locked" hint; surface the real
        # error for anything else so users notice genuine failures.
        local err
        err="$(rm "$p" 2>&1 || true)"
        if [[ "$err" == *"Device or resource busy"* ]] || \
           [[ "$err" == *"Operation not permitted"* ]] || \
           [[ "$err" == *"Permission denied"* ]]; then
            echo "  ✗ $(rel "$p") is locked (backend holding the file)."
            echo "    Stop the backend first: scripts/kill-servers.sh"
            exit 1
        fi
        echo "  ✗ failed to delete $(rel "$p"): $err"
        exit 1
    fi
    echo "  ✔ deleted $(rel "$p")"
}

cmd="${1:-}"

case "$cmd" in
    reset)
        echo "▶ Resetting database"
        if [ ! -d "$DATA_DIR" ]; then
            echo "  · $(rel "$DATA_DIR") does not exist — nothing to reset"
            exit 0
        fi
        rm_db_file "$DB_PATH"
        rm_db_file "${DB_PATH}-wal"     # Write-Ahead Log sidecar (only with WAL mode)
        rm_db_file "${DB_PATH}-shm"     # Shared memory sidecar (only with WAL mode)
        echo
        echo "  ✓ Reset complete. Run scripts/dev.sh to re-migrate + seed."
        ;;
    seed)
        echo "▶ Seed"
        echo "  The backend seeds sample data automatically the first time"
        echo "  it boots against an empty database. To reseed from scratch,"
        echo "  stop the backend, wipe the DB, then start the backend again:"
        echo
        echo "    scripts/kill-servers.sh"
        echo "    scripts/db.sh reset"
        echo "    scripts/dev.sh"
        echo
        echo "  See backend/src/db/seed.ts for what gets inserted."
        ;;
    path)
        # Single-line, no decoration - matches the JS version exactly so
        # downstream tools (xargs, $()) can consume the output cleanly.
        printf '%s\n' "$DB_PATH"
        ;;
    *)
        if [ -n "$cmd" ]; then
            echo "✗ Unknown subcommand: $cmd" >&2
        fi
        echo "Usage: scripts/db.sh <reset|seed|path>" >&2
        exit 1
        ;;
esac
