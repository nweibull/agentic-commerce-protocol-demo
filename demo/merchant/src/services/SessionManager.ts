/**
 * Checkout session management service
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  CheckoutSession,
  CheckoutSessionCreateRequest,
  CheckoutSessionUpdateRequest,
  CheckoutSessionCompleteRequest,
  CheckoutStatus,
  LineItem,
  Buyer,
  Address,
  PaymentProvider,
  Message,
  Link,
  Order,
} from '../models/types';
import { ProductCatalog } from '../models/product';
import { PricingCalculator } from './PricingCalculator';
import { FulfillmentManager } from './FulfillmentManager';
import { PaymentService } from './PaymentService';

export class SessionManager {
  private pool: Pool;
  private productCatalog: ProductCatalog;
  private pricingCalculator: PricingCalculator;
  private fulfillmentManager: FulfillmentManager;
  private paymentService: PaymentService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.productCatalog = new ProductCatalog(pool);
    this.pricingCalculator = new PricingCalculator();
    this.fulfillmentManager = new FulfillmentManager(this.pricingCalculator);
    this.paymentService = new PaymentService();
  }

  /**
   * Create a new checkout session
   */
  async createSession(request: CheckoutSessionCreateRequest): Promise<CheckoutSession> {
    const sessionId = `cs_${uuidv4()}`;

    // Validate and build line items
    const { lineItems, errors, requiresShipping } = await this.validateAndBuildLineItems(request.items);

    if (errors.length > 0) {
      // Return session with errors but don't save to DB
      return this.buildErrorSession(sessionId, request, errors);
    }

    // Generate fulfillment options
    const fulfillmentOptions = this.fulfillmentManager.generateOptions(
      requiresShipping,
      request.fulfillment_address
    );

    // Select default fulfillment option
    const fulfillmentOptionId = this.fulfillmentManager.selectDefaultOption(fulfillmentOptions);

    // Calculate fulfillment cost
    const fulfillmentCost = this.fulfillmentManager.getFulfillmentCost(
      fulfillmentOptionId,
      fulfillmentOptions
    );

    // Calculate totals
    const totals = this.pricingCalculator.calculateTotals(
      lineItems,
      fulfillmentCost,
      request.fulfillment_address
    );

    // Determine status
    const status: CheckoutStatus = this.determineStatus(
      lineItems,
      requiresShipping,
      request.fulfillment_address,
      fulfillmentOptionId
    );

    // Create session object
    const session: CheckoutSession = {
      id: sessionId,
      buyer: request.buyer,
      payment_provider: this.getPaymentProvider(),
      status,
      currency: 'usd',
      line_items: lineItems,
      fulfillment_address: request.fulfillment_address,
      fulfillment_options: fulfillmentOptions,
      fulfillment_option_id: fulfillmentOptionId,
      totals,
      messages: this.generateMessages(status, requiresShipping, request.fulfillment_address),
      links: this.generateLinks(),
    };

    // Save to database
    await this.saveSession(session);

    return session;
  }

  /**
   * Update an existing checkout session
   */
  async updateSession(
    sessionId: string,
    request: CheckoutSessionUpdateRequest
  ): Promise<CheckoutSession> {
    // Retrieve existing session
    const existingSession = await this.getSession(sessionId);
    if (!existingSession) {
      throw new Error('Session not found');
    }

    if (existingSession.status === 'completed' || existingSession.status === 'canceled') {
      throw new Error('Cannot update completed or canceled session');
    }

    // Update fields
    const buyer = request.buyer || existingSession.buyer;
    const fulfillmentAddress = request.fulfillment_address || existingSession.fulfillment_address;

    // Update line items if provided
    let lineItems = existingSession.line_items;
    let requiresShipping = this.checkIfRequiresShipping(lineItems);

    if (request.items) {
      const result = await this.validateAndBuildLineItems(request.items);
      if (result.errors.length > 0) {
        return this.buildErrorSession(sessionId, { ...request, items: request.items }, result.errors);
      }
      lineItems = result.lineItems;
      requiresShipping = result.requiresShipping;
    }

    // Regenerate fulfillment options if address or items changed
    const fulfillmentOptions = this.fulfillmentManager.generateOptions(
      requiresShipping,
      fulfillmentAddress
    );

    // Handle fulfillment option selection
    let fulfillmentOptionId = request.fulfillment_option_id || existingSession.fulfillment_option_id;

    // Validate the fulfillment option if specified
    if (fulfillmentOptionId && !this.fulfillmentManager.validateOption(fulfillmentOptionId, fulfillmentOptions)) {
      // Invalid option, reset to default
      fulfillmentOptionId = this.fulfillmentManager.selectDefaultOption(fulfillmentOptions);
    }

    // If no fulfillment option selected but we have options available, select default
    if (!fulfillmentOptionId && fulfillmentOptions.length > 0) {
      fulfillmentOptionId = this.fulfillmentManager.selectDefaultOption(fulfillmentOptions);
    }

    // Calculate fulfillment cost
    const fulfillmentCost = this.fulfillmentManager.getFulfillmentCost(
      fulfillmentOptionId,
      fulfillmentOptions
    );

    // Recalculate totals
    const totals = this.pricingCalculator.calculateTotals(
      lineItems,
      fulfillmentCost,
      fulfillmentAddress
    );

    // Determine status
    const status = this.determineStatus(
      lineItems,
      requiresShipping,
      fulfillmentAddress,
      fulfillmentOptionId
    );

    // Build updated session
    const session: CheckoutSession = {
      id: sessionId,
      buyer,
      payment_provider: this.getPaymentProvider(),
      status,
      currency: 'usd',
      line_items: lineItems,
      fulfillment_address: fulfillmentAddress,
      fulfillment_options: fulfillmentOptions,
      fulfillment_option_id: fulfillmentOptionId,
      totals,
      messages: this.generateMessages(status, requiresShipping, fulfillmentAddress),
      links: this.generateLinks(),
    };

    // Update in database
    await this.saveSession(session);

    return session;
  }

  /**
   * Get an existing checkout session
   */
  async getSession(sessionId: string): Promise<CheckoutSession | null> {
    const client = await this.pool.connect();

    try {
      // Get session
      const sessionResult = await client.query(
        'SELECT * FROM checkout_sessions WHERE id = $1',
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return null;
      }

      const sessionRow = sessionResult.rows[0];

      // Get line items
      const lineItemsResult = await client.query(
        'SELECT * FROM line_items WHERE session_id = $1 ORDER BY created_at',
        [sessionId]
      );

      const lineItems: LineItem[] = lineItemsResult.rows.map((row) => ({
        id: row.id,
        item: {
          id: row.item_id,
          quantity: row.quantity,
        },
        base_amount: row.base_amount,
        discount: row.discount,
        subtotal: row.subtotal,
        tax: row.tax,
        total: row.total,
      }));

      // Reconstruct fulfillment address
      const fulfillmentAddress: Address | undefined = sessionRow.fulfillment_address
        ? JSON.parse(sessionRow.fulfillment_address)
        : undefined;

      // Reconstruct buyer
      const buyer: Buyer | undefined =
        sessionRow.buyer_email
          ? {
              first_name: sessionRow.buyer_first_name,
              last_name: sessionRow.buyer_last_name,
              email: sessionRow.buyer_email,
              phone_number: sessionRow.buyer_phone_number,
            }
          : undefined;

      // Regenerate fulfillment options
      const requiresShipping = this.checkIfRequiresShipping(lineItems);
      const fulfillmentOptions = this.fulfillmentManager.generateOptions(
        requiresShipping,
        fulfillmentAddress
      );

      // Calculate fulfillment cost
      const fulfillmentCost = this.fulfillmentManager.getFulfillmentCost(
        sessionRow.fulfillment_option_id,
        fulfillmentOptions
      );

      // Recalculate totals
      const totals = this.pricingCalculator.calculateTotals(
        lineItems,
        fulfillmentCost,
        fulfillmentAddress
      );

      // Get order if exists
      let order: Order | undefined;
      if (sessionRow.order_id) {
        const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [
          sessionRow.order_id,
        ]);
        if (orderResult.rows.length > 0) {
          const orderRow = orderResult.rows[0];
          order = {
            id: orderRow.id,
            checkout_session_id: orderRow.checkout_session_id,
            permalink_url: orderRow.permalink_url,
          };
        }
      }

      const session: CheckoutSession = {
        id: sessionRow.id,
        buyer,
        payment_provider: this.getPaymentProvider(),
        status: sessionRow.status as CheckoutStatus,
        currency: sessionRow.currency,
        line_items: lineItems,
        fulfillment_address: fulfillmentAddress,
        fulfillment_options: fulfillmentOptions,
        fulfillment_option_id: sessionRow.fulfillment_option_id,
        totals,
        messages: this.generateMessages(
          sessionRow.status,
          requiresShipping,
          fulfillmentAddress
        ),
        links: this.generateLinks(),
        order,
      };

      return session;
    } finally {
      client.release();
    }
  }

  /**
   * Complete a checkout session and create an order
   */
  async completeSession(
    sessionId: string,
    request: CheckoutSessionCompleteRequest
  ): Promise<CheckoutSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Session already completed');
    }

    if (session.status === 'canceled') {
      throw new Error('Cannot complete canceled session');
    }

    if (session.status !== 'ready_for_payment') {
      throw new Error('Session not ready for payment');
    }

    // ============================================================================
    // PSP INTEGRATION POINT
    // ============================================================================
    // At this point, the merchant has received:
    // 1. payment_data.token - The tokenized payment method from the client
    // 2. payment_data.provider - The payment provider (e.g., 'stripe')
    // 3. payment_data.billing_address - Optional billing address
    //
    // The merchant should now:
    // 1. Send the token to the PSP (Payment Service Provider) to charge the customer
    // 2. Include: amount, currency, checkout_session_id for reference
    // 3. Wait for PSP response to confirm payment success/failure
    // 4. Handle payment failures appropriately (return error to client)
    // ============================================================================

    const totalAmount = session.totals.find(t => t.type === 'total')?.amount || 0;

    const paymentIntent = await this.paymentService.processPayment({
      shared_payment_token: request.payment_data.token,
      amount: totalAmount,
      currency: session.currency,
    });

    // Check if payment succeeded
    if (paymentIntent.status !== 'completed') {
      // Payment failed - throw error with message
      throw new Error(`Payment processing failed with status: ${paymentIntent.status}`);
    }

    // ============================================================================
    // END PSP INTEGRATION
    // Payment confirmed - proceed to create order
    // ============================================================================

    // Update buyer if provided
    const buyer = request.buyer || session.buyer;

    // Create order
    const orderId = `order_${uuidv4()}`;
    const order: Order = {
      id: orderId,
      checkout_session_id: sessionId,
      permalink_url: `https://merchant.example.com/orders/${orderId}`,
    };

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Insert order
      await client.query(
        `INSERT INTO orders (id, checkout_session_id, permalink_url, payment_token, payment_provider, billing_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.id,
          order.checkout_session_id,
          order.permalink_url,
          request.payment_data.token,
          request.payment_data.provider,
          request.payment_data.billing_address
            ? JSON.stringify(request.payment_data.billing_address)
            : null,
        ]
      );

      // Update session
      await client.query(
        `UPDATE checkout_sessions
         SET status = $1, order_id = $2, updated_at = CURRENT_TIMESTAMP,
             buyer_first_name = $3, buyer_last_name = $4, buyer_email = $5, buyer_phone_number = $6
         WHERE id = $7`,
        [
          'completed',
          order.id,
          buyer?.first_name,
          buyer?.last_name,
          buyer?.email,
          buyer?.phone_number,
          sessionId,
        ]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Return updated session
    const updatedSession = await this.getSession(sessionId);
    if (!updatedSession) {
      throw new Error('Failed to retrieve completed session');
    }

    return updatedSession;
  }

  /**
   * Validate that product IDs exist in the catalog
   * Returns array of invalid product IDs
   */
  async validateProductIds(productIds: string[]): Promise<string[]> {
    const invalidIds: string[] = [];
    for (const id of productIds) {
      const product = this.productCatalog.getProduct(id);
      if (!product) {
        invalidIds.push(id);
      }
    }
    return invalidIds;
  }

  /**
   * Cancel a checkout session
   */
  async cancelSession(sessionId: string): Promise<CheckoutSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Cannot cancel completed session');
    }

    if (session.status === 'canceled') {
      return session; // Already canceled
    }

    // Update status
    await this.pool.query(
      'UPDATE checkout_sessions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['canceled', sessionId]
    );

    // Return updated session
    const updatedSession = await this.getSession(sessionId);
    if (!updatedSession) {
      throw new Error('Failed to retrieve canceled session');
    }

    return updatedSession;
  }

  // ==================== Private Helper Methods ====================

  private async validateAndBuildLineItems(items: { id: string; quantity: number }[]): Promise<{
    lineItems: LineItem[];
    errors: Message[];
    requiresShipping: boolean;
  }> {
    const lineItems: LineItem[] = [];
    const errors: Message[] = [];
    let requiresShipping = false;

    for (const item of items) {
      const product = await this.productCatalog.getProduct(item.id);

      if (!product) {
        errors.push({
          type: 'error',
          code: 'invalid',
          param: `$.items[?(@.id=='${item.id}')]`,
          content_type: 'plain',
          content: `Product ${item.id} not found`,
        });
        continue;
      }

      const isAvailable = await this.productCatalog.checkAvailability(item.id, item.quantity);
      if (!isAvailable) {
        errors.push({
          type: 'error',
          code: 'out_of_stock',
          param: `$.items[?(@.id=='${item.id}')]`,
          content_type: 'plain',
          content: `Product ${item.id} is out of stock or insufficient quantity available`,
        });
        continue;
      }

      const lineItem = this.pricingCalculator.buildLineItem(product, item);
      lineItems.push(lineItem);

      if (product.requires_shipping) {
        requiresShipping = true;
      }
    }

    return { lineItems, errors, requiresShipping };
  }

  private checkIfRequiresShipping(lineItems: LineItem[]): boolean {
    return lineItems.some((item) => {
      const product = this.productCatalog.getProduct(item.item.id);
      return product?.requires_shipping || false;
    });
  }

  private determineStatus(
    lineItems: LineItem[],
    requiresShipping: boolean,
    address?: Address,
    fulfillmentOptionId?: string
  ): CheckoutStatus {
    if (lineItems.length === 0) {
      return 'not_ready_for_payment';
    }

    if (requiresShipping) {
      if (!address || !fulfillmentOptionId) {
        return 'not_ready_for_payment';
      }
    }

    return 'ready_for_payment';
  }

  private buildErrorSession(
    sessionId: string,
    request: CheckoutSessionCreateRequest | CheckoutSessionUpdateRequest,
    errors: Message[]
  ): CheckoutSession {
    return {
      id: sessionId,
      buyer: request.buyer,
      payment_provider: this.getPaymentProvider(),
      status: 'not_ready_for_payment',
      currency: 'usd',
      line_items: [],
      fulfillment_address: request.fulfillment_address,
      fulfillment_options: [],
      totals: [],
      messages: errors,
      links: this.generateLinks(),
    };
  }

  private generateMessages(
    status: CheckoutStatus,
    requiresShipping: boolean,
    address?: Address
  ): Message[] {
    const messages: Message[] = [];

    if (status === 'not_ready_for_payment') {
      if (requiresShipping && !address) {
        messages.push({
          type: 'info',
          param: '$.fulfillment_address',
          content_type: 'plain',
          content: 'Please provide a shipping address to continue',
        });
      }
    }

    return messages;
  }

  private generateLinks(): Link[] {
    return [
      {
        type: 'terms_of_use',
        url: 'https://merchant.example.com/terms',
      },
      {
        type: 'privacy_policy',
        url: 'https://merchant.example.com/privacy',
      },
    ];
  }

  private getPaymentProvider(): PaymentProvider {
    return {
      provider: 'stripe',
      supported_payment_methods: ['card'],
    };
  }

  private async saveSession(session: CheckoutSession): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Upsert session
      await client.query(
        `INSERT INTO checkout_sessions
         (id, buyer_first_name, buyer_last_name, buyer_email, buyer_phone_number, status, currency,
          fulfillment_address, fulfillment_option_id, order_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           buyer_first_name = EXCLUDED.buyer_first_name,
           buyer_last_name = EXCLUDED.buyer_last_name,
           buyer_email = EXCLUDED.buyer_email,
           buyer_phone_number = EXCLUDED.buyer_phone_number,
           status = EXCLUDED.status,
           currency = EXCLUDED.currency,
           fulfillment_address = EXCLUDED.fulfillment_address,
           fulfillment_option_id = EXCLUDED.fulfillment_option_id,
           order_id = EXCLUDED.order_id,
           updated_at = CURRENT_TIMESTAMP`,
        [
          session.id,
          session.buyer?.first_name,
          session.buyer?.last_name,
          session.buyer?.email,
          session.buyer?.phone_number,
          session.status,
          session.currency,
          session.fulfillment_address ? JSON.stringify(session.fulfillment_address) : null,
          session.fulfillment_option_id,
          session.order?.id,
        ]
      );

      // Delete existing line items
      await client.query('DELETE FROM line_items WHERE session_id = $1', [session.id]);

      // Insert new line items
      for (const item of session.line_items) {
        await client.query(
          `INSERT INTO line_items (id, session_id, item_id, quantity, base_amount, discount, subtotal, tax, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            item.id,
            session.id,
            item.item.id,
            item.item.quantity,
            item.base_amount,
            item.discount,
            item.subtotal,
            item.tax,
            item.total,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}