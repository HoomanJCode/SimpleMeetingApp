#!/usr/bin/env node
/**
 * SQLite database helper.
 *
 * Subcommands:
 *   reset   Delete the DB file (and any WAL/SHM sidecars). The next time the
 *           backend starts, it auto-runs migrations + the first-boot sample
 *           seed on a fresh file. If the backend is currently running, stop
 *           it first (npm run kill).
 *   seed    Sample-data seeding happens automatically the first time the
 *           backend boots against an empty DB (see backend/src/db/seed.ts).
 *           To reseed from scratch: `npm run db:reset && npm run dev`.
 *   path    Print the absolute path of the SQLite file.
 *
 * The DB lives at backend/data/irmeeting.db. The backend creates that
 * directory on first start if it doesn't exist.
 */
const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..', 'backend');
const DATA_DIR = path.join(BACKEND, 'data');
const DB_PATH = path.join(DATA_DIR, 'irmeeting.db');

function rel(p) {
  // Print relative-to-cwd paths so output is short and legible.
  return path.relative(process.cwd(), p);
}

function rm(p) {
  if (!fs.existsSync(p)) {
    console.log(`  · ${rel(p)} did not exist`);
    return;
  }
  try {
    fs.unlinkSync(p);
    console.log(`  ✔ deleted ${rel(p)}`);
  } catch (err) {
    if (err && (err.code === 'EBUSY' || err.code === 'EPERM')) {
      console.error(`  ✗ ${rel(p)} is locked (${err.code}).`);
      console.error('    Stop the backend first: npm run kill');
      process.exit(1);
    }
    throw err;
  }
}

const cmd = process.argv[2];

switch (cmd) {
  case 'reset': {
    console.log('▶ Resetting database');
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`  · ${rel(DATA_DIR)} does not exist — nothing to reset`);
      process.exit(0);
    }
    rm(DB_PATH);
    rm(DB_PATH + '-wal'); // Write-Ahead Log sidecar (only present if WAL mode)
    rm(DB_PATH + '-shm'); // Shared memory sidecar (only present if WAL mode)
    console.log('');
    console.log('  ✓ Reset complete. Run `npm run dev` to re-migrate + seed.');
    break;
  }
  case 'seed': {
    console.log('▶ Seed');
    console.log('  The backend seeds sample data automatically the first time');
    console.log('  it boots against an empty database. To reseed from scratch,');
    console.log('  stop the backend, wipe the DB, then start the backend again:');
    console.log('');
    console.log('    npm run kill');
    console.log('    npm run db:reset');
    console.log('    npm run dev');
    console.log('');
    console.log('  See backend/src/db/seed.ts for what gets inserted.');
    break;
  }
  case 'path': {
    console.log(DB_PATH);
    break;
  }
  default: {
    console.error('Usage: node scripts/db.js <reset|seed|path>');
    process.exit(1);
  }
}
