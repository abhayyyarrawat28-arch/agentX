import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data;
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        const details: Record<string, string[]> = {};
        e.errors.forEach(err => {
          const path = err.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(err.message);
        });
        sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, details);
        return;
      }
      throw e;
    }
  };
}
