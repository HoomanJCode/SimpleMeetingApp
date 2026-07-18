// Load .env file before any other imports that read environment variables
import { config } from 'dotenv';
config({ path: __dirname + '/../.env' });

import http from 'http';
import { loadEnv } from './config/env';
import { createApp } from './app';
import { logger } from './utils/logger';

async function main() {
  // Load and validate environment variables
  const env = loadEnv();
  logger.info({ env: env.NODE_ENV }, 'Starting IrMeetingApp backend');

  // Create Express app
  const app = createApp();

  // Create HTTP server
  const server = http.createServer(app);

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
        process.exit(1);
      }
      logger.info('Server closed gracefully');
      process.exit(0);
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
