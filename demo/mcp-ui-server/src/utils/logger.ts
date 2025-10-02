/**
 * Structured logging utility for MCP server
 */

export class Logger {
  private static formatMoney(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  static sessionAction(action: string, sessionId: string, details?: string): void {
    console.log(`→ ${action}: ${sessionId}${details ? ` | ${details}` : ''}`);
  }

  static paymentInitiated(sessionId: string, amount: number): void {
    console.log(`→ Payment initiated: ${this.formatMoney(amount)}`);
  }

  static paymentSuccess(orderId: string): void {
    console.log(`✓ Payment successful | Order: ${orderId}`);
  }

  static paymentFailed(reason: string): void {
    console.log(`✗ Payment failed: ${reason}`);
  }

  static serverStarted(port: number): void {
    console.log(`\n🎯 MCP UI Server`);
    console.log(`   Port: ${port}\n`);
  }

  static connectionEstablished(sessionId: string): void {
    // Silent - don't log connections
  }

  static connectionClosed(sessionId: string): void {
    // Silent - don't log disconnections
  }
}
