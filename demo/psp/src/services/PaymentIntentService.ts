import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import {
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  PaymentIntentError,
} from '../models/types';

/**
 * PaymentIntentService handles payment processing using vault tokens
 *
 * Flow:
 * 1. Merchant receives vault token from client
 * 2. Merchant calls create_and_process_payment_intent with token, amount, currency
 * 3. Service validates token is active and not expired
 * 4. Service validates amount doesn't exceed allowance.max_amount
 * 5. Service validates currency matches allowance.currency
 * 6. Service creates payment intent with 'pending' status
 * 7. Service simulates payment processing (2 second delay)
 * 8. Service marks payment as 'completed'
 * 9. Service invalidates vault token (status = 'consumed')
 * 10. Service returns payment intent details
 */
export class PaymentIntentService {
  /**
   * Generate a unique payment intent ID with pi_ prefix
   */
  private static generatePaymentIntentId(): string {
    const randomId = uuidv4().replace(/-/g, '').substring(0, 16);
    return `pi_${randomId}`;
  }

  /**
   * Validate vault token exists, is active, and not expired
   */
  private static async validateVaultToken(vaultTokenId: string): Promise<any> {
    const result = await pool.query(
      `SELECT id, created, payment_method, allowance, billing_address,
              risk_signals, metadata, status
       FROM vault_tokens
       WHERE id = $1`,
      [vaultTokenId]
    );

    if (result.rows.length === 0) {
      throw {
        status: 400,
        body: {
          type: 'invalid_request',
          code: 'invalid_vault_token',
          message: 'Vault token not found',
          param: 'shared_payment_token',
        },
      };
    }

    const token = result.rows[0];

    // Check if token is already consumed
    if (token.status === 'consumed') {
      throw {
        status: 400,
        body: {
          type: 'invalid_request',
          code: 'vault_token_already_used',
          message: 'Vault token has already been used',
          param: 'shared_payment_token',
        },
      };
    }

    // Check if token is expired based on allowance.expires_at
    const allowance = token.allowance;
    const expiresAt = new Date(allowance.expires_at);
    if (expiresAt < new Date()) {
      throw {
        status: 400,
        body: {
          type: 'invalid_request',
          code: 'vault_token_expired',
          message: 'Vault token has expired',
          param: 'shared_payment_token',
        },
      };
    }

    return token;
  }

  /**
   * Validate payment amount and currency against allowance
   */
  private static validatePaymentDetails(
    amount: number,
    currency: string,
    allowance: any
  ): void {
    // Validate amount doesn't exceed max_amount
    if (amount > allowance.max_amount) {
      throw {
        status: 400,
        body: {
          type: 'invalid_request',
          code: 'amount_exceeds_allowance',
          message: `Amount ${amount} exceeds maximum allowance of ${allowance.max_amount}`,
          param: 'amount',
        },
      };
    }

    // Validate currency matches
    if (currency !== allowance.currency) {
      throw {
        status: 400,
        body: {
          type: 'invalid_request',
          code: 'currency_mismatch',
          message: `Currency ${currency} does not match vault token currency ${allowance.currency}`,
          param: 'currency',
        },
      };
    }

    // Validate allowance reason is one_time
    if (allowance.reason !== 'one_time') {
      throw {
        status: 400,
        body: {
          type: 'invalid_request',
          code: 'invalid_allowance',
          message: 'Vault token allowance must be one_time',
        },
      };
    }
  }

  /**
   * Simulate payment processing with a delay
   */
  private static async simulatePaymentProcessing(): Promise<void> {
    // Simulate payment processing time (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Invalidate vault token by marking it as consumed
   */
  private static async invalidateVaultToken(vaultTokenId: string): Promise<void> {
    await pool.query(
      `UPDATE vault_tokens
       SET status = 'consumed'
       WHERE id = $1`,
      [vaultTokenId]
    );
  }

  /**
   * Create and process a payment intent
   * This is the main endpoint called by merchants to process payments
   */
  static async createAndProcessPaymentIntent(
    request: CreatePaymentIntentRequest
  ): Promise<PaymentIntentResponse> {
    const { shared_payment_token, amount, currency, merchant_id, metadata } = request;

    // Step 1: Validate vault token
    const vaultToken = await this.validateVaultToken(shared_payment_token);

    // Step 2: Validate payment details against allowance
    this.validatePaymentDetails(amount, currency, vaultToken.allowance);

    // Step 3: Create payment intent with 'pending' status
    const paymentIntentId = this.generatePaymentIntentId();
    const created = new Date().toISOString();

    await pool.query(
      `INSERT INTO payment_intents
       (id, vault_token_id, status, amount, currency, merchant_id, metadata, created)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7)`,
      [
        paymentIntentId,
        shared_payment_token,
        amount,
        currency,
        merchant_id || vaultToken.allowance.merchant_id,
        JSON.stringify(metadata || {}),
        created,
      ]
    );

    // Step 4: Simulate payment processing
    console.log(`[PaymentIntent ${paymentIntentId}] Processing payment...`);
    await this.simulatePaymentProcessing();

    // Step 5: Mark payment as completed
    const completedAt = new Date().toISOString();
    await pool.query(
      `UPDATE payment_intents
       SET status = 'completed', completed_at = $1
       WHERE id = $2`,
      [completedAt, paymentIntentId]
    );

    // Step 6: Invalidate vault token
    await this.invalidateVaultToken(shared_payment_token);

    console.log(`[PaymentIntent ${paymentIntentId}] Payment completed successfully`);

    // Step 7: Return payment intent response
    return {
      id: paymentIntentId,
      status: 'completed',
      amount,
      currency,
      vault_token_id: shared_payment_token,
      created,
      completed_at: completedAt,
      metadata: metadata || {},
    };
  }

  /**
   * Get payment intent details by ID
   */
  static async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse | null> {
    const result = await pool.query(
      `SELECT id, vault_token_id, status, amount, currency, merchant_id,
              metadata, created, completed_at
       FROM payment_intents
       WHERE id = $1`,
      [paymentIntentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const intent = result.rows[0];
    return {
      id: intent.id,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
      vault_token_id: intent.vault_token_id,
      created: intent.created,
      completed_at: intent.completed_at,
      metadata: intent.metadata || {},
    };
  }
}
