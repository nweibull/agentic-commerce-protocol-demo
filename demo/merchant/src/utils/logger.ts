/**
 * Structured logging utility for cleaner, more standardized output
 */

interface SessionInfo {
  id: string;
  status: string;
  items?: number;
  total?: number;
}

export class Logger {
  private static formatMoney(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  static sessionCreated(session: any): void {
    const itemCount = session.line_items?.length || 0;
    const total = session.totals?.find((t: any) => t.type === 'total')?.amount || 0;

    console.log(`✓ Session created: ${session.id}`);
    console.log(`  └─ ${itemCount} item${itemCount !== 1 ? 's' : ''}, ${this.formatMoney(total)} | ${session.status}`);
  }

  static sessionUpdated(session: any, updateType: string): void {
    const itemCount = session.line_items?.length || 0;
    const total = session.totals?.find((t: any) => t.type === 'total')?.amount || 0;

    console.log(`✓ Session updated (${updateType}): ${session.id}`);
    console.log(`  └─ ${itemCount} item${itemCount !== 1 ? 's' : ''}, ${this.formatMoney(total)} | ${session.status}`);
  }

  static sessionCompleted(session: any, orderId?: string): void {
    const total = session.totals?.find((t: any) => t.type === 'total')?.amount || 0;

    console.log(`✓ Session completed: ${session.id}`);
    if (orderId) {
      console.log(`  └─ Order ${orderId} | ${this.formatMoney(total)} charged`);
    }
  }

  static sessionCanceled(sessionId: string): void {
    console.log(`✗ Session canceled: ${sessionId}`);
  }

  static paymentProcessing(sessionId: string, provider: string, amount: number): void {
    console.log(`→ Processing payment via ${provider}: ${sessionId}`);
    console.log(`  └─ ${this.formatMoney(amount)}`);
  }

  static paymentCompleted(sessionId: string, orderId: string): void {
    console.log(`✓ Payment completed: ${sessionId}`);
    console.log(`  └─ Order created: ${orderId}`);
  }

  static error(context: string, error: any): void {
    console.error(`✗ Error (${context}):`, error.message || error);
  }

  static serverStarted(port: number, apiVersion: string): void {
    console.log(`\n🚀 Merchant Server`);
    console.log(`   Port: ${port}`);
    console.log(`   API Version: ${apiVersion}\n`);
  }
}
