import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled server error:', err);
  }
  const status = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd && status === 500
    ? 'An unexpected server error occurred. Please try again later.'
    : (err.message || 'Internal Server Error');
  
  if (res.headersSent) {
    return next(err);
  }

  return res.status(status).json({
    error: message,
    success: false,
  });
}
