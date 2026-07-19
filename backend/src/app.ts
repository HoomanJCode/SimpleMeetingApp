import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { getEnv } from './config/env';
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

  // Rate limiting
  app.use(generalLimiter);

  // Routes
  app.use('/api', routes);

  // 404 handler
  app.use('/api/*', notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
