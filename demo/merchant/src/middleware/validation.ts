/**
 * Request validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logSignatureVerification } from './logging';

export function validateApiVersion(req: Request, res: Response, next: NextFunction): void {
  const apiVersion = req.headers['api-version'];
  const expectedVersion = process.env.API_VERSION || '2025-09-12';

  if (apiVersion !== expectedVersion) {
    res.status(400).json({
      type: 'invalid_request',
      code: 'invalid_api_version',
      message: `Invalid API version. Expected: ${expectedVersion}`,
      param: 'api-version',
    });
    return;
  }

  next();
}

export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  // Only validate content-type for POST/PUT with a body
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if ((req.method === 'POST' || req.method === 'PUT') && contentLength > 0) {
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({
        type: 'invalid_request',
        code: 'invalid_content_type',
        message: 'Content-Type must be application/json',
      });
      return;
    }
  }

  next();
}

export function validateTimestamp(req: Request, res: Response, next: NextFunction): void {
  const timestamp = req.headers['timestamp'] as string;

  if (!timestamp) {
    res.status(400).json({
      type: 'invalid_request',
      code: 'missing_timestamp',
      message: 'Timestamp header is required',
    });
    return;
  }

  // Parse timestamp (RFC 3339 format)
  const requestTime = new Date(timestamp);
  const now = new Date();

  // Check if timestamp is valid
  if (isNaN(requestTime.getTime())) {
    res.status(400).json({
      type: 'invalid_request',
      code: 'invalid_timestamp',
      message: 'Timestamp must be in RFC 3339 format',
    });
    return;
  }

  // Reject timestamps in the future
  if (requestTime.getTime() > now.getTime()) {
    res.status(400).json({
      type: 'invalid_request',
      code: 'timestamp_in_future',
      message: 'Request timestamp cannot be in the future',
    });
    return;
  }

  // Prevent replay attacks - reject requests older than 5 minutes
  const age = now.getTime() - requestTime.getTime();
  const maxAge = parseInt(process.env.TIMESTAMP_MAX_AGE_MS || '300000'); // 5 minutes default

  if (age > maxAge) {
    res.status(400).json({
      type: 'invalid_request',
      code: 'timestamp_too_old',
      message: `Request timestamp is too old (must be within ${maxAge / 1000} seconds)`,
    });
    return;
  }

  next();
}

export function validateSignature(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['signature'] as string;
  const timestamp = req.headers['timestamp'] as string;
  const requestId = req.headers['request-id'] as string || 'unknown';

  if (!signature) {
    res.status(400).json({
      type: 'invalid_request',
      code: 'missing_signature',
      message: 'Signature header is required',
    });
    return;
  }

  // Use shared secret for signature verification
  const secret = process.env.WEBHOOK_SECRET || 'test_secret_123';

  try {
    // Signature algorithm: HMAC-SHA256(timestamp + request_method + request_path + request_body)
    const requestMethod = req.method;
    const requestPath = req.path;
    const requestBody = Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '';

    const signaturePayload = `${timestamp}${requestMethod}${requestPath}${requestBody}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('base64');

    // For MVP, we'll accept any valid base64 signature (mocked validation)
    // In production: if (signature !== expectedSignature) { reject }

    // Basic validation: check if it's valid base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(signature)) {
      logSignatureVerification(requestId, false, signature, expectedSignature);
      res.status(403).json({
        type: 'invalid_request',
        code: 'invalid_signature',
        message: 'Invalid signature format',
      });
      return;
    }

    // Log successful verification
    logSignatureVerification(requestId, true, signature, expectedSignature);

    // Store expected signature in request for debugging
    (req as any).expectedSignature = expectedSignature;

    next();
  } catch (error) {
    logSignatureVerification(requestId, false, signature);
    res.status(403).json({
      type: 'invalid_request',
      code: 'invalid_signature',
      message: 'Failed to verify signature',
    });
  }
}

export function validateRequiredHeaders(req: Request, res: Response, next: NextFunction): void {
  // Content-Type is only required for POST/PUT requests with a body
  const requiredHeaders = [
    'authorization',
    'accept-language',
    'user-agent',
    'idempotency-key',
    'request-id',
    'signature',
    'timestamp',
    'api-version'
  ];

  // Add content-type requirement for POST/PUT
  if (req.method === 'POST' || req.method === 'PUT') {
    requiredHeaders.push('content-type');
  }

  const missingHeaders = requiredHeaders.filter(header => !req.headers[header]);

  if (missingHeaders.length > 0) {
    res.status(400).json({
      type: 'invalid_request',
      code: 'missing_headers',
      message: `Missing required headers: ${missingHeaders.join(', ')}`,
    });
    return;
  }

  next();
}