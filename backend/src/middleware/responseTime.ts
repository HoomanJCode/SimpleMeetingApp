import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Logs response time and status for every request.
 * Uses debug for success, warn for client/server errors.
 */
export function responseTime(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'debug';
    logger[level]({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId: (req as any).requestId,
    }, 'request completed');
  });

  next();
}
