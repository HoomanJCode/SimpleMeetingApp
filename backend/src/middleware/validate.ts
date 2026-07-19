import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Middleware factory that validates request data against Zod schemas.
 * Supports body, query, and params validation.
 */
export function validate(options: ValidateOptions) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (options.body) {
        req.body = options.body.parse(req.body);
      }
      if (options.query) {
        const parsed = options.query.parse(req.query);
        // Express 5 makes req.query a getter-only property
        try {
          req.query = parsed as any;
        } catch {
          Object.defineProperty(req, 'query', {
            value: parsed,
            writable: true,
            configurable: true,
          });
        }
      }
      if (options.params) {
        const parsed = options.params.parse(req.params);
        // Express 5 may also make req.params getter-only
        try {
          req.params = parsed as any;
        } catch {
          Object.defineProperty(req, 'params', {
            value: parsed,
            writable: true,
            configurable: true,
          });
        }
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // Zod v4 uses .issues instead of .errors
        const issues = (err as any).issues || (err as any).errors || [];
        const details = issues.reduce(
          (acc: Record<string, string>, e: any) => {
            const path = Array.isArray(e.path) ? e.path.join('.') : String(e.path || '');
            acc[path || '_root'] = e.message;
            return acc;
          },
          {} as Record<string, string>
        );
        next(new ValidationError(details));
        return;
      }
      next(err);
    }
  };
}
