/**
 * Checkout session routes
 */

import { Router } from 'express';
import { CheckoutController } from '../controllers/CheckoutController';
import { validateRequiredHeaders, validateTimestamp, validateSignature } from '../middleware/validation';
import { handleIdempotency } from '../middleware/idempotency';

export function createCheckoutRoutes(controller: CheckoutController): Router {
  const router = Router();

  // POST /checkout_sessions - Create session
  router.post(
    '/checkout_sessions',
    validateRequiredHeaders,
    validateTimestamp,
    validateSignature,
    handleIdempotency,
    controller.createSession
  );

  // GET /checkout_sessions/:checkout_session_id - Retrieve session
  router.get(
    '/checkout_sessions/:checkout_session_id',
    validateRequiredHeaders,
    validateTimestamp,
    validateSignature,
    controller.getSession
  );

  // POST /checkout_sessions/:checkout_session_id - Update session
  router.post(
    '/checkout_sessions/:checkout_session_id',
    validateRequiredHeaders,
    validateTimestamp,
    validateSignature,
    handleIdempotency,
    controller.updateSession
  );

  // POST /checkout_sessions/:checkout_session_id/complete - Complete session
  router.post(
    '/checkout_sessions/:checkout_session_id/complete',
    validateRequiredHeaders,
    validateTimestamp,
    validateSignature,
    handleIdempotency,
    controller.completeSession
  );

  // POST /checkout_sessions/:checkout_session_id/cancel - Cancel session
  router.post(
    '/checkout_sessions/:checkout_session_id/cancel',
    validateRequiredHeaders,
    validateTimestamp,
    validateSignature,
    handleIdempotency,
    controller.cancelSession
  );

  return router;
}