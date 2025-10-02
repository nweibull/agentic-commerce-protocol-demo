/**
 * Authentication middleware
 */

import { Request, Response, NextFunction } from 'express';

export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      type: 'invalid_request',
      code: 'missing_authorization',
      message: 'Authorization header is required',
    });
    return;
  }

  const expectedKey = process.env.API_KEY || 'test_api_key_123';
  const providedKey = authHeader.replace('Bearer ', '');

  if (providedKey !== expectedKey) {
    res.status(401).json({
      type: 'invalid_request',
      code: 'invalid_authorization',
      message: 'Invalid API key',
    });
    return;
  }

  next();
}