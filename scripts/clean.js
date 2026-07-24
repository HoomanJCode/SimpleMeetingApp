#!/usr/bin/env node
/**
 * Clean build + test artifacts across the workspace.
 *
 * Removes:
 *   - backend/dist      (tsc output)
 *   - frontend/dist     (vite build output)
 *   - tests/test-results (playwright raw output)
 *   - tests/playwright-report (playwright HTML report)
 *
 * Does NOT touch:
 *   - node_modules (use `rm -rf node_modules backend/node_modules ...` manually)
 *   - backend/data (SQLite DB — wipe with `npm run db:reset` instead)
 */
const fs = require('fs');
const path = require('path');

const TARGETS = [
  ['backend', 'dist'],
  ['frontend', 'dist'],
  ['tests', 'test-results'],
  ['tests', 'playwright-report'],
];

console.log('▶ Cleaning build + test artifacts');

for (const [rootDir, sub] of TARGETS) {
  const full = path.join(__dirname, '..', rootDir, sub);
  try {
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`  ✔ removed ${path.relative(process.cwd(), full)}`);
  } catch (err) {
    console.log(`  · skipped ${path.relative(process.cwd(), full)} (${err.code || 'no-op'})`);
  }
}

console.log('  Done.');
