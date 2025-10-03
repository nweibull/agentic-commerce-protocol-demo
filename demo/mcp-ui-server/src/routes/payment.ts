import { Express } from 'express';
import { MerchantSessionService } from '../services/MerchantSessionService.js';
import { Logger } from '../utils/logger.js';

const MERCHANT_URL = process.env.MERCHANT_BASE_URL || 'http://localhost:4001';
const PSP_URL = process.env.PSP_BASE_URL || 'http://localhost:4000';
const MERCHANT_API_KEY = process.env.MERCHANT_API_KEY || 'test_api_key_123';
const MERCHANT_API_VERSION = process.env.MERCHANT_API_VERSION || '2025-09-29';
const PSP_CLIENT_API_KEY = process.env.PSP_CLIENT_API_KEY || 'client_token_123';
const PSP_API_VERSION = process.env.PSP_API_VERSION || '2025-09-29';

export function setupPaymentRoutes(
  app: Express,
  merchantService: MerchantSessionService,
  sessionId: string
) {
  // Process payment - handles full flow: PSP delegation -> merchant completion
  app.post('/payment/process', async (req, res) => {
    const { cardName, cardNumber, expMonth, expYear, cvc } = req.body;

    if (!cardName || !cardNumber || !expMonth || !expYear || !cvc) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }

    try {
      // Get the checkout session from merchant service
      const currentSession = merchantService.getActiveSession(sessionId);
      if (!currentSession) {
        return res.status(404).json({ error: 'No active checkout session' });
      }

      const checkoutSessionId = currentSession.id;
      const totalAmount = currentSession.totals?.find(t => t.type === 'total')?.amount || 0;

      Logger.paymentInitiated(sessionId, totalAmount);

      const timestamp = new Date().toISOString();

      // Prepare billing address from session's fulfillment address
      const billingAddress = currentSession.fulfillment_address ? {
        name: currentSession.fulfillment_address.name,
        line_one: currentSession.fulfillment_address.line_one,
        line_two: currentSession.fulfillment_address.line_two,
        city: currentSession.fulfillment_address.city,
        state: currentSession.fulfillment_address.state,
        country: currentSession.fulfillment_address.country,
        postal_code: currentSession.fulfillment_address.postal_code,
      } : undefined;

      const pspRequestBody = {
        payment_method: {
          type: 'card',
          card_number_type: 'fpan',
          number: cardNumber.replace(/\s/g, ''),
          exp_month: expMonth,
          exp_year: expYear,
          cvc: cvc,
          name: cardName,
          display_card_funding_type: 'credit',
          display_brand: 'visa',
          display_last4: cardNumber.replace(/\s/g, '').slice(-4),
          metadata: {}
        },
        allowance: {
          reason: 'one_time',
          max_amount: totalAmount,
          currency: 'usd',
          checkout_session_id: checkoutSessionId,
          merchant_id: 'merchant_123',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        },
        billing_address: billingAddress,
        risk_signals: [{
          type: 'card_testing',
          score: 5,
          action: 'authorized'
        }],
        metadata: { source: 'mcp_checkout' }
      };

      console.log(`[MCP] → POST /agentic_commerce/delegate_payment`);
      console.log(`  └─ Creating payment token...`);

      const pspResponse = await fetch(`${PSP_URL}/agentic_commerce/delegate_payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PSP_CLIENT_API_KEY}`,
          'API-Version': PSP_API_VERSION,
          'Accept-Language': 'en-US',
          'User-Agent': 'MCP-Server/1.0',
          'Idempotency-Key': `payment_${Date.now()}_${Math.random()}`,
          'Request-Id': `req_${Date.now()}`,
          'Timestamp': timestamp,
          'Signature': 'dGVzdF9zaWduYXR1cmVfMTIzNDU2',
        },
        body: JSON.stringify(pspRequestBody)
      });

      if (!pspResponse.ok) {
        const errorText = await pspResponse.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch (e) {
          error = { message: errorText || 'Payment failed' };
        }

        Logger.paymentFailed(error.message || 'PSP delegation failed');
        return res.status(pspResponse.status).json({ error: error.message || 'Payment failed' });
      }

      const pspData = await pspResponse.json();
      const vaultToken = pspData.id;

      const merchantTimestamp = new Date().toISOString();
      const merchantResponse = await fetch(`${MERCHANT_URL}/checkout_sessions/${checkoutSessionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MERCHANT_API_KEY}`,
          'API-Version': MERCHANT_API_VERSION,
          'Accept-Language': 'en-US',
          'User-Agent': 'MCP-Server/1.0',
          'Idempotency-Key': `complete_${Date.now()}_${Math.random()}`,
          'Request-Id': `req_${Date.now()}`,
          'Timestamp': merchantTimestamp,
          'Signature': 'dGVzdF9zaWduYXR1cmVfMTIzNDU2',
        },
        body: JSON.stringify({
          buyer: {
            first_name: cardName.split(' ')[0] || 'Customer',
            last_name: cardName.split(' ').slice(1).join(' ') || 'User',
            email: 'customer@example.com',
            phone_number: '+15551234567'
          },
          payment_data: {
            token: vaultToken,
            provider: 'stripe'
          }
        })
      });

      if (!merchantResponse.ok) {
        const error = await merchantResponse.json().catch(() => ({ message: 'Checkout failed' }));
        Logger.paymentFailed(error.message || 'Merchant completion failed');
        return res.status(merchantResponse.status).json({ error: error.message || 'Checkout failed' });
      }

      const merchantData = await merchantResponse.json();
      const orderId = merchantData.order?.id;

      Logger.paymentSuccess(orderId);

      // Clear the session after successful checkout
      merchantService.clearSession(sessionId);

      // Return only non-sensitive data to client
      res.json({
        success: true,
        orderId: orderId,
        status: merchantData.status
      });
    } catch (error: any) {
      Logger.paymentFailed(error.message || 'Failed to process payment');
      res.status(500).json({ error: error.message || 'Failed to process payment' });
    }
  });
}
