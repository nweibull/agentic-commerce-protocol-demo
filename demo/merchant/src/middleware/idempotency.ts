/**
 * Idempotency middleware
 */

import { Request, Response, NextFunction } from 'express';
import { IdempotencyService } from '../services/IdempotencyService';

const idempotencyService = new IdempotencyService();

/**
 * Middleware to handle idempotent requests
 * Only applies to POST requests
 */
export function handleIdempotency(req: Request, res: Response, next: NextFunction): void {
  // Only apply to POST requests
  if (req.method !== 'POST') {
    next();
    return;
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;

  // Check if this request was already processed
  try {
    const cachedResponse = idempotencyService.check(idempotencyKey, req.body);

    if (cachedResponse) {
      // Return cached response
      res
        .status(cachedResponse.responseStatus)
        .set(cachedResponse.responseHeaders)
        .json(cachedResponse.responseBody);
      return;
    }

    // Store reference to original json and status methods
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    let responseStatus = 200;
    let responseBody: any;
    let responseHeaders: Record<string, string> = {};

    // Override status method to capture status code
    res.status = function(code: number) {
      responseStatus = code;
      return originalStatus(code);
    };

    // Override json method to capture response and store it
    res.json = function(body: any) {
      responseBody = body;

      // Capture response headers
      const headerNames = res.getHeaderNames();
      headerNames.forEach(name => {
        const value = res.getHeader(name);
        if (value) {
          responseHeaders[name] = String(value);
        }
      });

      // Store response for future idempotent requests
      // Only store successful responses (2xx status codes)
      if (responseStatus >= 200 && responseStatus < 300) {
        idempotencyService.save(
          idempotencyKey,
          req.body,
          responseStatus,
          responseBody,
          responseHeaders
        );
      }

      return originalJson(body);
    };

    next();
  } catch (error) {
    if (error instanceof Error && error.message === 'request_not_idempotent') {
      res.status(400).json({
        type: 'invalid_request',
        code: 'request_not_idempotent',
        message: 'Request body does not match previous request with same idempotency key',
        param: 'Idempotency-Key',
      });
      return;
    }

    // Unknown error
    console.error('Error in idempotency middleware:', error);
    res.status(500).json({
      type: 'service_unavailable',
      code: 'internal_error',
      message: 'Failed to process idempotency check',
    });
  }
}

export { idempotencyService };