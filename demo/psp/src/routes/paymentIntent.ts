import { Router, Request, Response } from 'express';
import { PaymentIntentService } from '../services/PaymentIntentService';
import { CreatePaymentIntentRequest } from '../models/types';
import { authenticateMerchant } from '../middleware/merchantAuth';

const router = Router();

/**
 * POST /agentic_commerce/create_and_process_payment_intent
 *
 * Called by merchant servers to process payments using vault tokens received from clients.
 *
 * Flow:
 * 1. Client delegates payment to PSP -> receives vault token (vt_...)
 * 2. Client completes checkout with merchant -> sends vault token
 * 3. Merchant calls this endpoint with vault token, amount, and currency
 * 4. PSP validates token, processes payment, invalidates token
 *
 * Request Body:
 * {
 *   "shared_payment_token": "vt_abc123",  // Vault token from client
 *   "amount": 5000,                        // Amount in cents
 *   "currency": "usd",                     // Lowercase ISO-4217
 *   "merchant_id": "merchant_123",         // Optional
 *   "metadata": { ... }                    // Optional
 * }
 *
 * Success Response (201):
 * {
 *   "id": "pi_xyz789",
 *   "status": "completed",
 *   "amount": 5000,
 *   "currency": "usd",
 *   "vault_token_id": "vt_abc123",
 *   "created": "2025-10-01T12:00:00Z",
 *   "completed_at": "2025-10-01T12:00:02Z",
 *   "metadata": {}
 * }
 *
 * Error Responses:
 * - 400: Invalid vault token, token already used, token expired, amount exceeds allowance, currency mismatch
 * - 500: Internal server error
 */
router.post('/agentic_commerce/create_and_process_payment_intent', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { shared_payment_token, amount, currency, merchant_id, metadata } = req.body;

    // Validate required fields
    if (!shared_payment_token) {
      return res.status(400).json({
        type: 'invalid_request',
        code: 'missing_field',
        message: 'shared_payment_token is required',
        param: 'shared_payment_token',
      });
    }

    if (amount === undefined || amount === null) {
      return res.status(400).json({
        type: 'invalid_request',
        code: 'missing_field',
        message: 'amount is required',
        param: 'amount',
      });
    }

    if (!currency) {
      return res.status(400).json({
        type: 'invalid_request',
        code: 'missing_field',
        message: 'currency is required',
        param: 'currency',
      });
    }

    // Validate amount is a positive integer
    if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
      return res.status(400).json({
        type: 'invalid_request',
        code: 'invalid_amount',
        message: 'amount must be a positive integer',
        param: 'amount',
      });
    }

    // Validate currency is lowercase
    if (currency !== currency.toLowerCase()) {
      return res.status(400).json({
        type: 'invalid_request',
        code: 'invalid_currency',
        message: 'currency must be lowercase ISO-4217 format',
        param: 'currency',
      });
    }

    // Validate vault token format
    if (!shared_payment_token.startsWith('vt_')) {
      return res.status(400).json({
        type: 'invalid_request',
        code: 'invalid_vault_token_format',
        message: 'shared_payment_token must start with vt_',
        param: 'shared_payment_token',
      });
    }

    // Create request object
    const paymentRequest: CreatePaymentIntentRequest = {
      shared_payment_token,
      amount,
      currency,
      merchant_id,
      metadata,
    };

    // Process payment intent
    const paymentIntent = await PaymentIntentService.createAndProcessPaymentIntent(paymentRequest);

    // Return success response
    return res.status(201).json(paymentIntent);
  } catch (error: any) {
    // Handle known errors (validation errors from service)
    if (error.status && error.body) {
      return res.status(error.status).json(error.body);
    }

    // Handle unexpected errors
    console.error('Error processing payment intent:', error);
    return res.status(500).json({
      type: 'processing_error',
      code: 'processing_error',
      message: 'An error occurred while processing the payment',
    });
  }
});

/**
 * GET /agentic_commerce/payment_intents/:id
 *
 * Retrieve payment intent details by ID
 *
 * Success Response (200):
 * {
 *   "id": "pi_xyz789",
 *   "status": "completed",
 *   "amount": 5000,
 *   "currency": "usd",
 *   "vault_token_id": "vt_abc123",
 *   "created": "2025-10-01T12:00:00Z",
 *   "completed_at": "2025-10-01T12:00:02Z",
 *   "metadata": {}
 * }
 *
 * Error Response (404):
 * {
 *   "type": "invalid_request",
 *   "code": "payment_intent_not_found",
 *   "message": "Payment intent not found"
 * }
 */
router.get('/agentic_commerce/payment_intents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate payment intent ID format
    if (!id.startsWith('pi_')) {
      return res.status(400).json({
        type: 'invalid_request',
        code: 'invalid_payment_intent_id',
        message: 'Payment intent ID must start with pi_',
      });
    }

    // Retrieve payment intent
    const paymentIntent = await PaymentIntentService.getPaymentIntent(id);

    if (!paymentIntent) {
      return res.status(404).json({
        type: 'invalid_request',
        code: 'payment_intent_not_found',
        message: 'Payment intent not found',
      });
    }

    return res.status(200).json(paymentIntent);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    return res.status(500).json({
      type: 'processing_error',
      code: 'processing_error',
      message: 'An error occurred while retrieving the payment intent',
    });
  }
});

export default router;
