/**
 * Delegate Payment API Type Definitions
 * Based on delegate_payment.json schema
 */

// ============================================================================
// Address
// ============================================================================

export interface Address {
  /** Name on address (max 256 chars) */
  name: string;
  /** Address line 1 (max 60 chars) */
  line_one: string;
  /** Address line 2 (max 60 chars) */
  line_two?: string;
  /** City (max 60 chars) */
  city: string;
  /** State/Province */
  state: string;
  /** Country code - ISO-3166-1 alpha-2 (2 chars) */
  country: string;
  /** Postal code (max 20 chars) */
  postal_code: string;
}

// ============================================================================
// Payment Method
// ============================================================================

export type CardNumberType = 'fpan' | 'network_token';
export type CardFundingType = 'credit' | 'debit' | 'prepaid';
export type CheckPerformed = 'avs' | 'cvv' | 'ani' | 'auth0';

export interface PaymentMethodCard {
  /** Payment method type */
  type: 'card';
  /** Type of card number */
  card_number_type: CardNumberType;
  /** Network token or fallback FPAN value */
  number: string;
  /** Expiration month (max 2 chars) */
  exp_month?: string;
  /** Expiration year (max 4 chars) */
  exp_year?: string;
  /** Cardholder name */
  name?: string;
  /** Card verification code (max 4 chars) */
  cvc?: string;
  /** Cryptogram for network tokens */
  cryptogram?: string;
  /** ECI value (max 2 chars) */
  eci_value?: string;
  /** Security checks performed */
  checks_performed?: CheckPerformed[];
  /** Issuer Identification Number (max 6 chars) */
  iin?: string;
  /** Card funding type */
  display_card_funding_type: CardFundingType;
  /** Wallet type if applicable */
  display_wallet_type?: string;
  /** Card brand for display */
  display_brand?: string;
  /** Last 4 digits for display (max 4 chars) */
  display_last4?: string;
  /** Additional metadata */
  metadata: Record<string, string>;
}

// ============================================================================
// Allowance
// ============================================================================

export type AllowanceReason = 'one_time';

export interface Allowance {
  /** Reason for allowance */
  reason: AllowanceReason;
  /** Maximum amount in minor units (e.g., $20 -> 2000) */
  max_amount: number;
  /** Currency in ISO-4217 lowercase (e.g., 'usd') */
  currency: string;
  /** Associated checkout session ID */
  checkout_session_id: string;
  /** Merchant identifier (max 256 chars) */
  merchant_id: string;
  /** Expiration timestamp (RFC 3339) */
  expires_at: string;
}

// ============================================================================
// Risk Signals
// ============================================================================

export type RiskSignalType = 'card_testing';
export type RiskAction = 'blocked' | 'manual_review' | 'authorized';

export interface RiskSignal {
  /** Type of risk signal */
  type: RiskSignalType;
  /** Risk score */
  score: number;
  /** Action taken */
  action: RiskAction;
}

// ============================================================================
// Request & Response
// ============================================================================

export interface DelegatePaymentRequest {
  /** Payment method details */
  payment_method: PaymentMethodCard;
  /** Payment allowance parameters */
  allowance: Allowance;
  /** Billing address (optional) */
  billing_address?: Address;
  /** Risk signals (min 1 required) */
  risk_signals: RiskSignal[];
  /** Additional metadata */
  metadata: Record<string, string>;
}

export interface DelegatePaymentResponse {
  /** Vault token ID (e.g., vt_...) */
  id: string;
  /** Creation timestamp (RFC 3339) */
  created: string;
  /** Metadata passed through from request */
  metadata: Record<string, string>;
}

// ============================================================================
// Error Response
// ============================================================================

// Standard error types from schema
export type StandardErrorType =
  | 'invalid_request'
  | 'rate_limit_exceeded'
  | 'processing_error'
  | 'service_unavailable';

// Extended error types for implementation (includes invalid_card for 422 responses)
export type ErrorType = StandardErrorType | 'invalid_card' | string;

// Standard error codes from schema
export type StandardErrorCode =
  | 'invalid_card'
  | 'duplicate_request'
  | 'idempotency_conflict';

// Extended error codes for implementation
export type ErrorCode = StandardErrorCode | string;

export interface DelegatePaymentError {
  /** Error type */
  type: ErrorType;
  /** Error code */
  code: ErrorCode;
  /** Error message */
  message: string;
  /** JSONPath of offending field (optional) */
  param?: string;
}
