import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getEnv } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { generalLimiter } from './middleware/rateLimiter';
import routes from './routes';

export function createApp() {
  const env = getEnv();
  const app = express();

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

  // Rate limiting
  app.use(generalLimiter);

  // Request logging
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, url: req.url }, 'incoming request');
    next();
  });

  // Routes
  app.use('/api', routes);

  // 404 handler
  app.use('/api/*', notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
