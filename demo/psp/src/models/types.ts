/**
 * Types for PSP Payment Processing
 *
 * Payment Flow:
 * 1. Client obtains payment details from end user
 * 2. Client calls POST /agentic_commerce/delegate_payment -> receives vault token (id: "vt_...")
 * 3. Client sends vault token to merchant via POST /checkout_sessions/{id}/complete
 * 4. Merchant calls POST /agentic_commerce/create_and_process_payment_intent with vault token
 * 5. PSP processes payment, invalidates token, returns payment intent
 */

/**
 * Status of a vault token
 * - active: Token is valid and can be used for payment
 * - consumed: Token has been used and is no longer valid
 * - expired: Token has expired based on allowance.expires_at
 */
export type VaultTokenStatus = 'active' | 'consumed' | 'expired';

/**
 * Status of a payment intent
 * - pending: Payment is being processed
 * - completed: Payment was successfully processed
 * - failed: Payment processing failed
 */
export type PaymentIntentStatus = 'pending' | 'completed' | 'failed';

/**
 * Request body for creating and processing a payment intent
 */
export interface CreatePaymentIntentRequest {
  /**
   * The vault token ID received from delegate_payment endpoint
   * Format: vt_<alphanumeric>
   */
  shared_payment_token: string;

  /**
   * Amount to charge in minor units (e.g., cents for USD)
   * Must not exceed the max_amount from the vault token's allowance
   */
  amount: number;

  /**
   * Currency code in lowercase ISO-4217 format (e.g., "usd")
   * Must match the currency from the vault token's allowance
   */
  currency: string;

  /**
   * Optional merchant identifier for tracking
   */
  merchant_id?: string;

  /**
   * Optional metadata for the payment intent
   */
  metadata?: Record<string, any>;
}

/**
 * Response from creating a payment intent
 */
export interface PaymentIntentResponse {
  /**
   * Unique identifier for the payment intent
   * Format: pi_<alphanumeric>
   */
  id: string;

  /**
   * Status of the payment intent
   */
  status: PaymentIntentStatus;

  /**
   * Amount charged in minor units
   */
  amount: number;

  /**
   * Currency code
   */
  currency: string;

  /**
   * Vault token that was used (now consumed)
   */
  vault_token_id: string;

  /**
   * Timestamp when the payment intent was created (RFC 3339)
   */
  created: string;

  /**
   * Timestamp when the payment was completed (RFC 3339)
   * Only present if status is 'completed'
   */
  completed_at?: string;

  /**
   * Metadata associated with the payment
   */
  metadata: Record<string, any>;
}

/**
 * Error response for payment intent creation
 */
export interface PaymentIntentError {
  type: string;
  code: string;
  message: string;
  param?: string;
}
