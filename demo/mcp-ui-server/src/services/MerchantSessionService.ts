import {
  CheckoutSession,
  CheckoutSessionCreateRequest,
  CheckoutSessionUpdateRequest,
  Item,
  RequestHeaders,
} from '../types/merchant.js';

/**
 * Service class to manage merchant checkout sessions
 * Delegates session state updates to the merchant API
 */
export class MerchantSessionService {
  private merchantBaseUrl: string;
  private apiKey: string;
  private apiVersion: string;

  // Store active session per MCP session
  private activeSessions: Map<string, CheckoutSession>;

  // Track checkout flow state per MCP session
  private checkoutFlowState: Map<string, {
    hasContactInfo: boolean;
    hasShippingAddress: boolean;
  }>;

  constructor(
    merchantBaseUrl: string = 'http://localhost:3000',
    apiKey: string = 'test_api_key_123',
    apiVersion: string = '2025-09-29'
  ) {
    this.merchantBaseUrl = merchantBaseUrl;
    this.apiKey = apiKey;
    this.apiVersion = apiVersion;
    this.activeSessions = new Map();
    this.checkoutFlowState = new Map();
  }

  /**
   * Build request headers following the merchant API requirements
   */
  private buildHeaders(): HeadersInit {
    const timestamp = new Date().toISOString();
    const headers: RequestHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'API-Version': this.apiVersion,
      'Accept-Language': 'en-US',
      'User-Agent': 'MCP-Option-Selector/1.0',
      'Content-Type': 'application/json',
      'Idempotency-Key': `mcp_${Date.now()}_${Math.random()}`,
      'Request-Id': `req_${Date.now()}`,
      'Timestamp': timestamp,
      'Signature': 'dGVzdF9zaWduYXR1cmVfMTIzNDU2', // Valid base64: "test_signature_123456"
    };
    return headers as HeadersInit;
  }

  /**
   * Get the active session for a given MCP session ID
   */
  getActiveSession(mcpSessionId: string): CheckoutSession | undefined {
    return this.activeSessions.get(mcpSessionId);
  }

  /**
   * Check if there is an active session for a given MCP session ID
   */
  hasActiveSession(mcpSessionId: string): boolean {
    return this.activeSessions.has(mcpSessionId);
  }

  /**
   * Get checkout flow state for a given MCP session ID
   */
  getCheckoutFlowState(mcpSessionId: string) {
    return this.checkoutFlowState.get(mcpSessionId) || {
      hasContactInfo: false,
      hasShippingAddress: false,
    };
  }

  /**
   * Check if session has complete contact info (first name, last name, email)
   */
  hasCompleteContactInfo(mcpSessionId: string): boolean {
    const session = this.getActiveSession(mcpSessionId);
    if (!session || !session.buyer) {
      return false;
    }
    const { first_name, last_name, email } = session.buyer;
    return !!(first_name && last_name && email);
  }

  /**
   * Check if session has shipping/fulfillment address
   */
  hasShippingAddress(mcpSessionId: string): boolean {
    const session = this.getActiveSession(mcpSessionId);
    if (!session || !session.fulfillment_address) {
      return false;
    }
    const { name, line_one, city, state, country, postal_code } = session.fulfillment_address;
    return !!(name && line_one && city && state && country && postal_code);
  }

  /**
   * Check if ready for payment collection
   */
  isReadyForPayment(mcpSessionId: string): boolean {
    return this.hasActiveSession(mcpSessionId) &&
           this.hasCompleteContactInfo(mcpSessionId) &&
           this.hasShippingAddress(mcpSessionId);
  }

  /**
   * Create a new checkout session with the merchant
   */
  async createSession(
    mcpSessionId: string,
    items: Item[]
  ): Promise<CheckoutSession> {
    const requestBody: CheckoutSessionCreateRequest = {
      items,
    };

    const response = await fetch(`${this.merchantBaseUrl}/checkout_sessions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create session: ${error.message || response.statusText}`);
    }

    const session: CheckoutSession = await response.json();
    this.activeSessions.set(mcpSessionId, session);
    return session;
  }

  /**
   * Update an existing checkout session
   */
  async updateSession(
    mcpSessionId: string,
    updates: CheckoutSessionUpdateRequest
  ): Promise<CheckoutSession> {
    const currentSession = this.activeSessions.get(mcpSessionId);
    if (!currentSession) {
      throw new Error('No active session found');
    }

    const response = await fetch(
      `${this.merchantBaseUrl}/checkout_sessions/${currentSession.id}`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update session: ${error.message || response.statusText}`);
    }

    const session: CheckoutSession = await response.json();
    this.activeSessions.set(mcpSessionId, session);
    return session;
  }

  /**
   * Get the current state of a checkout session from the merchant
   */
  async refreshSession(mcpSessionId: string): Promise<CheckoutSession> {
    const currentSession = this.activeSessions.get(mcpSessionId);
    if (!currentSession) {
      throw new Error('No active session found');
    }

    const response = await fetch(
      `${this.merchantBaseUrl}/checkout_sessions/${currentSession.id}`,
      {
        method: 'GET',
        headers: this.buildHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to refresh session: ${error.message || response.statusText}`);
    }

    const session: CheckoutSession = await response.json();
    this.activeSessions.set(mcpSessionId, session);
    return session;
  }

  /**
   * Add items to the cart (or create a new session if none exists)
   */
  async addItemsToCart(
    mcpSessionId: string,
    items: Item[]
  ): Promise<CheckoutSession> {
    if (!this.hasActiveSession(mcpSessionId)) {
      // Create a new session with these items
      return this.createSession(mcpSessionId, items);
    } else {
      // Get current session and merge items
      const currentSession = this.activeSessions.get(mcpSessionId)!;
      const existingItems = currentSession.line_items.map(li => li.item);

      // Merge items: if item already exists, add quantities, otherwise add new item
      const itemMap = new Map<string, number>();
      existingItems.forEach(item => {
        itemMap.set(item.id, item.quantity);
      });

      items.forEach(item => {
        const currentQty = itemMap.get(item.id) || 0;
        itemMap.set(item.id, currentQty + item.quantity);
      });

      const mergedItems: Item[] = Array.from(itemMap.entries()).map(([id, quantity]) => ({
        id,
        quantity,
      }));

      return this.updateSession(mcpSessionId, { items: mergedItems });
    }
  }

  /**
   * Cancel a checkout session with the merchant
   */
  async cancelSession(mcpSessionId: string): Promise<CheckoutSession> {
    const currentSession = this.activeSessions.get(mcpSessionId);
    if (!currentSession) {
      throw new Error('No active session found');
    }

    const response = await fetch(
      `${this.merchantBaseUrl}/checkout_sessions/${currentSession.id}/cancel`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to cancel session: ${error.message || response.statusText}`);
    }

    const session: CheckoutSession = await response.json();
    this.activeSessions.delete(mcpSessionId);
    this.checkoutFlowState.delete(mcpSessionId);
    return session;
  }

  /**
   * Clear the active session for a given MCP session ID (local only, doesn't call API)
   */
  clearSession(mcpSessionId: string): void {
    this.activeSessions.delete(mcpSessionId);
    this.checkoutFlowState.delete(mcpSessionId);
  }
}
