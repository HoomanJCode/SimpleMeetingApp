import fs from 'fs';
import path from 'path';
import { getDb } from './connection';
import { logger } from '../utils/logger';

interface MigrationFile {
  name: string;
  sql: string;
}

/**
 * Loads all SQL migration files from the migrations directory.
 * Files are sorted alphabetically (001_, 002_, etc.).
 */
function loadMigrationFiles(): MigrationFile[] {
  const migrationsDir = path.resolve(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    logger.warn('Migrations directory does not exist');
    return [];
  }

  const files: string[] = fs
    .readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  return files.map((file: string) => ({
    name: file,
    sql: fs.readFileSync(path.join(migrationsDir, file), 'utf-8'),
  }));
}

/**
 * Ensures the migrations tracking table exists.
 */
function ensureMigrationsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * Returns the list of already-executed migration names.
 */
function getExecutedMigrations(): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT name FROM _migrations ORDER BY id').all() as {
    name: string;
  }[];
  return rows.map((r) => r.name);
}

/**
 * Runs all pending migrations in order.
 */
export function runMigrations(): void {
  const db = getDb();
  ensureMigrationsTable();

  const executed = getExecutedMigrations();
  const migrations = loadMigrationFiles();
  const pending = migrations.filter((m) => !executed.includes(m.name));

  if (pending.length === 0) {
    logger.info('No pending migrations');
    return;
  }

  logger.info({ count: pending.length }, 'Running pending migrations');

  const insertStmt = db.prepare(
    'INSERT INTO _migrations (name) VALUES (?)'
  );

  for (const migration of pending) {
    logger.info({ migration: migration.name }, 'Executing migration');
    db.exec(migration.sql);
    insertStmt.run(migration.name);
    logger.info({ migration: migration.name }, 'Migration completed');
  }

  logger.info('All migrations completed');
}
