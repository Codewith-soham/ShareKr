import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/apiError.js';

// Validates and replaces req.body with the parsed (trimmed, normalized) value.
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      next(new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', details));
      return;
    }
    req.body = result.data;
    next();
  };
