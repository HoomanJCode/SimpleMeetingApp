import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

type ValidationTarget = 'body' | 'query' | 'params';

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
        req.query = options.query.parse(req.query) as any;
      }
      if (options.params) {
        req.params = options.params.parse(req.params) as any;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.reduce(
          (acc, e) => {
            const path = e.path.join('.');
            acc[path] = e.message;
            return acc;
          },
          {} as Record<string, string>
        );
        throw new ValidationError(details);
      }
      throw err;
    }
  };
}
