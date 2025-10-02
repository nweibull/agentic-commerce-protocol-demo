/**
 * Request logging middleware
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Log request details with Request-Id for tracing
 */
export function logRequest(req: Request, res: Response, next: NextFunction): void {
  // Skip logging for health checks
  if (req.path === '/health') {
    next();
    return;
  }

  const requestId = req.headers['request-id'] as string || 'unknown';

  // Log incoming request - simplified
  console.log(`← ${req.method} ${req.path}`);

  // Store request start time
  const startTime = Date.now();

  // Capture original res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    const duration = Date.now() - startTime;

    // Only log if response is an error
    if (res.statusCode >= 400) {
      console.log(`✗ ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }

    return originalJson(body);
  };

  next();
}

/**
 * Log signature verification results
 */
export function logSignatureVerification(
  requestId: string,
  success: boolean,
  providedSignature?: string,
  expectedSignature?: string
): void {
  const timestamp = new Date().toISOString();

  if (success) {
    console.log(`[${timestamp}] [${requestId}] Signature verification: SUCCESS`);
  } else {
    console.warn(`[${timestamp}] [${requestId}] Signature verification: FAILED`, {
      provided: providedSignature ? providedSignature.substring(0, 20) + '...' : 'none',
      expected: expectedSignature ? expectedSignature.substring(0, 20) + '...' : 'none',
    });
  }
}

/**
 * Log error details
 */
export function logError(
  requestId: string,
  error: Error | unknown,
  context?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();

  console.error(`[${timestamp}] [${requestId}] ERROR:`, {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    context,
  });
}

/**
 * Log webhook delivery attempt
 */
export function logWebhookDelivery(
  webhookId: string,
  url: string,
  event: string,
  attempt: number,
  success: boolean,
  responseStatus?: number,
  error?: string
): void {
  const timestamp = new Date().toISOString();

  if (success) {
    console.log(`[${timestamp}] [webhook:${webhookId}] Delivered ${event} to ${url} (attempt ${attempt}) - ${responseStatus}`);
  } else {
    console.warn(`[${timestamp}] [webhook:${webhookId}] Failed to deliver ${event} to ${url} (attempt ${attempt})`, {
      status: responseStatus,
      error,
    });
  }
}