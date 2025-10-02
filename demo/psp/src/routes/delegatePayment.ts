import { Router, Request, Response } from 'express';
import { validateRequiredHeaders, validateRequestBody } from '../utils/validation';
import { IdempotencyService } from '../services/IdempotencyService';
import { VaultTokenService } from '../services/VaultTokenService';
import { DelegatePaymentRequest, DelegatePaymentResponse, DelegatePaymentError } from '../models/delegatePaymentTypes';

const router = Router();

router.post('/agentic_commerce/delegate_payment', async (req: Request<{}, DelegatePaymentResponse | DelegatePaymentError, DelegatePaymentRequest>, res: Response<DelegatePaymentResponse | DelegatePaymentError>) => {
  try {
    // Validate required headers
    const headerError = validateRequiredHeaders(req);
    if (headerError) {
      return res.status(400).json(headerError);
    }

    // Validate request body
    const bodyError = validateRequestBody(req.body);
    if (bodyError) {
      const status = bodyError.type === 'invalid_card' ? 422 : 400;
      return res.status(status).json(bodyError);
    }

    const idempotencyKey = req.headers['idempotency-key'] as string;
    const requestId = req.headers['request-id'] as string;

    // Check idempotency
    try {
      const cachedResponse = await IdempotencyService.checkIdempotency(
        idempotencyKey,
        req.body
      );

      if (cachedResponse) {
        // Return cached response for duplicate request
        return res.status(cachedResponse.status).json(cachedResponse.body);
      }
    } catch (error: any) {
      // Idempotency conflict
      if (error.status === 409) {
        return res.status(error.status).json(error.body);
      }
      throw error;
    }

    // Create vault token
    const vaultToken = await VaultTokenService.createVaultToken({
      payment_method: req.body.payment_method,
      allowance: req.body.allowance,
      billing_address: req.body.billing_address,
      risk_signals: req.body.risk_signals,
      metadata: req.body.metadata,
      idempotency_key: idempotencyKey,
      request_id: requestId,
    });

    const responseBody = {
      id: vaultToken.id,
      created: vaultToken.created,
      metadata: vaultToken.metadata,
    };

    // Store response for idempotency
    await IdempotencyService.storeResponse(
      idempotencyKey,
      req.body,
      201,
      responseBody
    );

    // Return success response
    return res.status(201).json(responseBody);
  } catch (error) {
    console.error('Error processing delegate_payment request:', error);
    return res.status(500).json({
      type: 'processing_error',
      code: 'duplicate_request', // Using valid ErrorCode from schema
      message: 'An error occurred while processing the request',
    } as DelegatePaymentError);
  }
});

export default router;
