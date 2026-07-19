// Load .env file before any other imports that read environment variables
import { config } from 'dotenv';
config({ path: __dirname + '/../.env' });

import http from 'http';
import { loadEnv } from './config/env';
import { createApp } from './app';
import { logger } from './utils/logger';
import { getDb, closeDb } from './db/connection';
import { runMigrations } from './db/migrate';
import { createWebSocketServer } from './websocket';

async function main() {
  // Load and validate environment variables
  const env = loadEnv();
  logger.info({ env: env.NODE_ENV }, 'Starting IrMeetingApp backend');

  // Ensure database is initialized and migrations are run
  getDb();
  runMigrations();

  // Create Express app
  const app = createApp();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize WebSocket server
  createWebSocketServer(server);

  // Start listening
  server.listen(env.PORT, env.HOST, () => {
    logger.info({ host: env.HOST, port: env.PORT }, 'Server is listening');
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    server.close((err) => {
      if (err) {
        logger.error({ err }, 'Error during server shutdown');
      }
      closeDb();
      logger.info('Server closed gracefully');
      process.exit(err ? 1 : 0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
