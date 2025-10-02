/**
 * Payment routes - Process payments via PSP
 */

import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';

export function createPaymentRoutes(): Router {
  const router = Router();
  const paymentService = new PaymentService();

  /**
   * POST /create_and_process_payment_intent
   *
   * Client flow:
   * 1. Client sends payment info to PSP via delegate_payment
   * 2. Client receives shared_payment_token (vault token)
   * 3. Client sends shared_payment_token to merchant with checkout
   * 4. Merchant calls this endpoint to process payment with PSP
   *
   * Request body:
   * {
   *   "shared_payment_token": "vt_abc123",
   *   "amount": 5000,
   *   "currency": "usd"
   * }
   */
  router.post('/create_and_process_payment_intent', async (req: Request, res: Response) => {
    try {
      const { shared_payment_token, amount, currency } = req.body;

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

      // Call PSP to process payment
      const paymentIntent = await paymentService.processPayment({
        shared_payment_token,
        amount,
        currency,
      });

      // Return payment intent response
      return res.status(201).json(paymentIntent);
    } catch (error: any) {
      console.error('Error processing payment:', error);

      // If error has status and body (from PSP), pass it through
      if (error.status && error.body) {
        return res.status(error.status).json(error.body);
      }

      // Handle unexpected errors
      return res.status(500).json({
        type: 'processing_error',
        code: 'payment_processing_failed',
        message: error.message || 'Failed to process payment',
      });
    }
  });

  return router;
}
