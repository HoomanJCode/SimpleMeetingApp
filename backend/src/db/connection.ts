import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const env = getEnv();

    // Resolve absolute path
    const dbPath = path.resolve(env.DATABASE_PATH);
    const dataDir = path.dirname(dbPath);

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    logger.info({ dbPath }, 'Connecting to SQLite database');

    db = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    logger.info('Database connection established');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    logger.info('Closing database connection');
    db.close();
    db = null;
  }
}
