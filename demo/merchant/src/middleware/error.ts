/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  // Default to 500 server error
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    type: statusCode >= 500 ? 'service_unavailable' : 'processing_error',
    code: 'internal_error',
    message: err.message || 'An unexpected error occurred',
  });
}