#!/usr/bin/env bash
#
# Clean build + test artifacts (Bash).
#
# Removes:
#   - backend/dist           (tsc output)
#   - frontend/dist          (vite build output)
#   - tests/test-results     (playwright raw output)
#   - tests/playwright-report (playwright HTML report)
#
# Does NOT touch:
#   - node_modules (manual rm -r)
#   - backend/data (SQLite DB - use scripts/db.sh reset instead)
#
# KEEP IN SYNC with scripts/clean.js (legacy, REMOVED) and scripts/clean.ps1.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# (Dir:Sub) pairs - same list as the PS1 + JS versions.
TARGETS=(
  "backend:dist"
  "frontend:dist"
  "tests:test-results"
  "tests:playwright-report"
)

echo "▶ Cleaning build + test artifacts"

for t in "${TARGETS[@]}"; do
  dir="${t%%:*}"
  sub="${t##*:}"
  full="$ROOT/$dir/$sub"
  if [ -e "$full" ]; then
    rm -rf "$full"
    rel="${full#$PWD/}"
    echo "  ✔ removed $rel"
  else
    echo "  · skipped $dir/$sub (does not exist)"
  fi
done

echo "  Done."
