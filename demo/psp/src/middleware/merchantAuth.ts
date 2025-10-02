/**
 * Merchant authentication middleware for PSP
 * Validates merchant API key for payment intent endpoints
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Simple bearer token authentication for merchant requests
 */
export function authenticateMerchant(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      type: 'authentication_error',
      code: 'missing_authorization',
      message: 'Authorization header is required',
    });
  }

  // Expected format: "Bearer merchant_secret_key_123"
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer') {
    return res.status(401).json({
      type: 'authentication_error',
      code: 'invalid_authorization_scheme',
      message: 'Authorization must use Bearer scheme',
    });
  }

  if (!token) {
    return res.status(401).json({
      type: 'authentication_error',
      code: 'missing_token',
      message: 'Bearer token is required',
    });
  }

  // Simple validation - check against environment variable
  const validMerchantKey = process.env.MERCHANT_SECRET_KEY || 'merchant_secret_key_123';

  if (token !== validMerchantKey) {
    return res.status(401).json({
      type: 'authentication_error',
      code: 'invalid_token',
      message: 'Invalid merchant API key',
    });
  }

  // Authentication successful
  next();
}
