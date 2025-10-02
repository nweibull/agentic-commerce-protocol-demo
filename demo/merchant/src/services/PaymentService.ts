/**
 * Payment Service - Calls PSP to process payments
 */

export interface ChargeRequest {
  vault_token: string;
  amount: number;
  currency: string;
  checkout_session_id: string;
}

export interface ChargeResponse {
  id: string;
  status: 'succeeded' | 'failed' | 'pending';
  amount: number;
  currency: string;
  vault_token: string;
  checkout_session_id: string;
  failure_code?: string;
  failure_message?: string;
  created: string;
}

export interface ProcessPaymentRequest {
  shared_payment_token: string;
  amount: number;
  currency: string;
}

export interface PaymentIntentResponse {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  vault_token_id: string;
  created: string;
  completed_at?: string;
  metadata: Record<string, any>;
}

export class PaymentService {
  private pspUrl: string;
  private merchantSecretKey: string;

  constructor() {
    this.pspUrl = process.env.PSP_URL || 'http://localhost:4000';
    this.merchantSecretKey = process.env.PSP_MERCHANT_SECRET_KEY || 'merchant_secret_key_123';
  }

  /**
   * Process payment via PSP using create_and_process_payment_intent endpoint
   */
  async processPayment(request: ProcessPaymentRequest): Promise<PaymentIntentResponse> {
    try {
      const response = await fetch(`${this.pspUrl}/agentic_commerce/create_and_process_payment_intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.merchantSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          body: errorData,
        };
      }

      const paymentIntent = await response.json() as PaymentIntentResponse;
      return paymentIntent;
    } catch (error: any) {
      console.error('Error processing payment via PSP:', error);
      throw error;
    }
  }

  /**
   * Charge a vault token via PSP
   */
  async chargeToken(request: ChargeRequest): Promise<ChargeResponse> {
    try {
      const response = await fetch(`${this.pspUrl}/charges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.merchantSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(errorData.message || `PSP charge failed with status ${response.status}`);
      }

      const chargeData = await response.json() as ChargeResponse;
      return chargeData;
    } catch (error) {
      console.error('Error charging token via PSP:', error);
      throw error;
    }
  }

  /**
   * Check if payment was successful
   */
  isPaymentSucceeded(charge: ChargeResponse): boolean {
    return charge.status === 'succeeded';
  }

  /**
   * Get failure message from charge
   */
  getFailureMessage(charge: ChargeResponse): string {
    return charge.failure_message || 'Payment was declined';
  }
}