import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Attaches a unique request ID to every request and exposes it in the response.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = randomUUID();
  res.setHeader('X-Request-Id', id);
  (req as any).requestId = id;
  next();
}
