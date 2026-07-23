import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { getEnv } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { generalLimiter } from './middleware/rateLimiter';
import { requestId } from './middleware/requestId';
import { responseTime } from './middleware/responseTime';
import routes from './routes';

export function createApp() {
  const env = getEnv();
  const app = express();

  // Request ID — must come first so all logs have it
  app.use(requestId);

  // Response time logging
  app.use(responseTime);

  // Compression — gzip responses
  app.use(compression());

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting — skip test routes to avoid throttling E2E DB resets
  app.use((req, res, next) => {
    if (process.env.ENABLE_TEST_ROUTES === '1' && req.path.startsWith('/api/test/')) {
      return next();
    }
    generalLimiter(req, res, next);
  });

  // Routes
  app.use('/api', routes);

  // 404 handler for any unmatched /api route
  app.use('/api', notFoundHandler);

  // Serve frontend static build in production
  if (env.NODE_ENV === 'production') {
    const buildPath = path.resolve(env.FRONTEND_BUILD_PATH);
    if (fs.existsSync(buildPath)) {
      app.use(express.static(buildPath));

      // SPA catch-all: serve index.html for any non-API route
      app.get('*', (_req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
      });
    } else {
      logger.warn({ buildPath }, 'Frontend build path does not exist; static files will not be served');
    }
  }

  // Global error handler
  app.use(errorHandler);

  return app;
}
