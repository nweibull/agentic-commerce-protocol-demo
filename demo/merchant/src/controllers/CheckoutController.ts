/**
 * Checkout session controller
 */

import { Request, Response } from 'express';
import { SessionManager } from '../services/SessionManager';
import {
  CheckoutSessionCreateRequest,
  CheckoutSessionUpdateRequest,
  CheckoutSessionCompleteRequest,
  Address,
} from '../models/types';
import {
  isValidCountryCode,
  isValidStateCode,
  isValidE164PhoneNumber,
  isValidPostalCode,
} from '../utils/validation';
import { Logger } from '../utils/logger';

export class CheckoutController {
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Validate address fields
   */
  private validateAddress(address: Address, fieldPath: string): { valid: boolean; error?: any } {
    if (address.country) {
      if (!isValidCountryCode(address.country)) {
        return {
          valid: false,
          error: {
            type: 'invalid_request',
            code: 'invalid_country_code',
            message: 'Country code must be valid ISO 3166-1 alpha-2 format',
            param: `${fieldPath}.country`,
          },
        };
      }
    }

    if (address.state && address.country) {
      if (!isValidStateCode(address.state, address.country)) {
        return {
          valid: false,
          error: {
            type: 'invalid_request',
            code: 'invalid_state_code',
            message: 'State/province code must be valid ISO 3166-2 format for the given country',
            param: `${fieldPath}.state`,
          },
        };
      }
    }

    // Note: phone_number is not part of the Address schema per OpenAPI spec

    if (address.postal_code && address.country) {
      if (!isValidPostalCode(address.postal_code, address.country)) {
        return {
          valid: false,
          error: {
            type: 'invalid_request',
            code: 'invalid_postal_code',
            message: 'Postal code format is invalid for the given country',
            param: `${fieldPath}.postal_code`,
          },
        };
      }
    }

    return { valid: true };
  }

  /**
   * POST /checkout_sessions
   * Create a new checkout session
   */
  createSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: CheckoutSessionCreateRequest = req.body;

      // Validate required fields
      if (!request.items || request.items.length === 0) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'missing_items',
          message: 'At least one item is required',
          param: '$.items',
        });
        return;
      }

      // Validate each item has required fields
      for (let i = 0; i < request.items.length; i++) {
        const item = request.items[i];
        if (!item.id) {
          res.status(400).json({
            type: 'invalid_request',
            code: 'missing_field',
            message: 'Item id is required',
            param: `$.items[${i}].id`,
          });
          return;
        }
        if (!item.quantity || item.quantity <= 0) {
          res.status(400).json({
            type: 'invalid_request',
            code: 'invalid_field',
            message: 'Item quantity must be greater than 0',
            param: `$.items[${i}].quantity`,
          });
          return;
        }
      }

      // Validate fulfillment_address if provided
      if (request.fulfillment_address) {
        const addressValidation = this.validateAddress(request.fulfillment_address, '$.fulfillment_address');
        if (!addressValidation.valid) {
          res.status(400).json(addressValidation.error);
          return;
        }
      }

      // Validate buyer.phone_number if provided
      if (request.buyer?.phone_number) {
        if (!isValidE164PhoneNumber(request.buyer.phone_number)) {
          res.status(400).json({
            type: 'invalid_request',
            code: 'invalid_phone_number',
            message: 'Phone number must be in E.164 format (e.g., +15552003434)',
            param: '$.buyer.phone_number',
          });
          return;
        }
      }

      // Validate product IDs exist in catalog before creating session
      const invalidProducts = await this.sessionManager.validateProductIds(request.items.map(i => i.id));
      if (invalidProducts.length > 0) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'invalid_product_id',
          message: `Invalid product IDs: ${invalidProducts.join(', ')}`,
          param: '$.items',
        });
        return;
      }

      const session = await this.sessionManager.createSession(request);

      Logger.sessionCreated(session);

      // Echo required headers
      const responseHeaders: Record<string, string> = {
        'Idempotency-Key': req.headers['idempotency-key'] as string,
        'Request-Id': req.headers['request-id'] as string,
      };

      res.status(201).set(responseHeaders).json(session);
    } catch (error) {
      Logger.error('createSession', error);
      res.status(500).json({
        type: 'service_unavailable',
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to create session',
      });
    }
  };

  /**
   * POST /checkout_sessions/:checkout_session_id
   * Update a checkout session
   */
  updateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.checkout_session_id;
      const request: CheckoutSessionUpdateRequest = req.body;

      // Validate items if provided
      if (request.items) {
        for (let i = 0; i < request.items.length; i++) {
          const item = request.items[i];
          if (item.id && (!item.quantity || item.quantity <= 0)) {
            res.status(400).json({
              type: 'invalid_request',
              code: 'invalid_field',
              message: 'Item quantity must be greater than 0',
              param: `$.items[${i}].quantity`,
            });
            return;
          }
        }
      }

      // Validate fulfillment_address if provided
      if (request.fulfillment_address) {
        const addressValidation = this.validateAddress(request.fulfillment_address, '$.fulfillment_address');
        if (!addressValidation.valid) {
          res.status(400).json(addressValidation.error);
          return;
        }
      }

      // Validate buyer.phone_number if provided
      if (request.buyer?.phone_number) {
        if (!isValidE164PhoneNumber(request.buyer.phone_number)) {
          res.status(400).json({
            type: 'invalid_request',
            code: 'invalid_phone_number',
            message: 'Phone number must be in E.164 format (e.g., +15552003434)',
            param: '$.buyer.phone_number',
          });
          return;
        }
      }

      const session = await this.sessionManager.updateSession(sessionId, request);

      // Determine update type for logging
      let updateType = 'items';
      if (request.buyer) updateType = 'buyer';
      if (request.fulfillment_address || request.fulfillment_method) updateType = 'shipping';

      Logger.sessionUpdated(session, updateType);

      // Echo required headers
      const responseHeaders: Record<string, string> = {
        'Idempotency-Key': req.headers['idempotency-key'] as string,
        'Request-Id': req.headers['request-id'] as string,
      };

      res.status(200).set(responseHeaders).json(session);
    } catch (error) {
      Logger.error('updateSession', error);

      if (error instanceof Error && error.message === 'Session not found') {
        res.status(404).json({
          type: 'invalid_request',
          code: 'session_not_found',
          message: 'Checkout session not found',
        });
        return;
      }

      if (
        error instanceof Error &&
        error.message === 'Cannot update completed or canceled session'
      ) {
        res.status(405).json({
          type: 'invalid_request',
          code: 'session_not_modifiable',
          message: 'Cannot update completed or canceled session',
        });
        return;
      }

      res.status(500).json({
        type: 'service_unavailable',
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to update session',
      });
    }
  };

  /**
   * GET /checkout_sessions/:checkout_session_id
   * Retrieve a checkout session
   */
  getSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.checkout_session_id;

      const session = await this.sessionManager.getSession(sessionId);

      if (!session) {
        res.status(404).json({
          type: 'invalid_request',
          code: 'session_not_found',
          message: 'Checkout session not found',
        });
        return;
      }

      // Echo required headers
      const responseHeaders: Record<string, string> = {
        'Idempotency-Key': req.headers['idempotency-key'] as string,
        'Request-Id': req.headers['request-id'] as string,
      };

      res.status(200).set(responseHeaders).json(session);
    } catch (error) {
      Logger.error('getSession', error);
      res.status(500).json({
        type: 'service_unavailable',
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to retrieve session',
      });
    }
  };

  /**
   * POST /checkout_sessions/:checkout_session_id/complete
   * Complete a checkout session
   */
  completeSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.checkout_session_id;
      const request: CheckoutSessionCompleteRequest = req.body;

      // Validate required fields
      if (!request.payment_data) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'missing_field',
          message: 'Payment data is required',
          param: '$.payment_data',
        });
        return;
      }

      if (!request.payment_data.token) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'missing_field',
          message: 'Payment token is required',
          param: '$.payment_data.token',
        });
        return;
      }

      if (!request.payment_data.provider) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'missing_field',
          message: 'Payment provider is required',
          param: '$.payment_data.provider',
        });
        return;
      }

      // Validate provider enum
      if (request.payment_data.provider !== 'stripe') {
        res.status(400).json({
          type: 'invalid_request',
          code: 'invalid_field',
          message: 'Payment provider must be "stripe"',
          param: '$.payment_data.provider',
        });
        return;
      }

      // Validate billing_address if provided
      if (request.payment_data.billing_address) {
        const addressValidation = this.validateAddress(
          request.payment_data.billing_address,
          '$.payment_data.billing_address'
        );
        if (!addressValidation.valid) {
          res.status(400).json(addressValidation.error);
          return;
        }
      }

      const session = await this.sessionManager.completeSession(sessionId, request);

      Logger.sessionCompleted(session, session.order_id);

      // Echo required headers
      const responseHeaders: Record<string, string> = {
        'Idempotency-Key': req.headers['idempotency-key'] as string,
        'Request-Id': req.headers['request-id'] as string,
      };

      res.status(200).set(responseHeaders).json(session);
    } catch (error) {
      Logger.error('completeSession', error);

      if (error instanceof Error && error.message === 'Session not found') {
        res.status(404).json({
          type: 'invalid_request',
          code: 'session_not_found',
          message: 'Checkout session not found',
        });
        return;
      }

      // Handle payment errors from PSP
      if (error instanceof Error && error.message.includes('declined')) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'payment_declined',
          message: 'Payment was declined',
          messages: [
            {
              type: 'error',
              code: 'payment_declined',
              content_type: 'plain',
              content: error.message,
            },
          ],
        });
        return;
      }

      if (error instanceof Error && error.message.includes('insufficient')) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'insufficient_funds',
          message: 'Insufficient funds',
          messages: [
            {
              type: 'error',
              code: 'payment_declined',
              content_type: 'plain',
              content: error.message,
            },
          ],
        });
        return;
      }

      if (error instanceof Error && error.message.includes('expired')) {
        res.status(400).json({
          type: 'invalid_request',
          code: 'expired_card',
          message: 'Card has expired',
          messages: [
            {
              type: 'error',
              code: 'payment_declined',
              content_type: 'plain',
              content: error.message,
            },
          ],
        });
        return;
      }

      if (
        error instanceof Error &&
        (error.message === 'Session not ready for payment' ||
          error.message === 'Cannot complete canceled session' ||
          error.message === 'Session already completed')
      ) {
        res.status(405).json({
          type: 'invalid_request',
          code: 'session_not_completable',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        type: 'service_unavailable',
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to complete session',
      });
    }
  };

  /**
   * POST /checkout_sessions/:checkout_session_id/cancel
   * Cancel a checkout session
   */
  cancelSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.checkout_session_id;

      const session = await this.sessionManager.cancelSession(sessionId);

      Logger.sessionCanceled(sessionId);

      // Echo required headers
      const responseHeaders: Record<string, string> = {
        'Idempotency-Key': req.headers['idempotency-key'] as string,
        'Request-Id': req.headers['request-id'] as string,
      };

      res.status(200).set(responseHeaders).json(session);
    } catch (error) {
      Logger.error('cancelSession', error);

      if (error instanceof Error && error.message === 'Session not found') {
        res.status(404).json({
          type: 'invalid_request',
          code: 'session_not_found',
          message: 'Checkout session not found',
        });
        return;
      }

      if (error instanceof Error && error.message === 'Cannot cancel completed session') {
        res.status(405).json({
          type: 'invalid_request',
          code: 'session_not_cancelable',
          message: 'Cannot cancel completed session',
        });
        return;
      }

      res.status(500).json({
        type: 'service_unavailable',
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to cancel session',
      });
    }
  };
}