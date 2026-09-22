import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  console.error(err);

  return res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Something went wrong' : String(err),
    code: 'INTERNAL_ERROR',
  });
}

export function notFoundMiddleware(_req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'NOT_FOUND',
  });
}
