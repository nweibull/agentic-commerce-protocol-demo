/**
 * Idempotency service for handling idempotent requests
 */

import crypto from 'crypto';

interface IdempotencyRecord {
  requestHash: string;
  responseStatus: number;
  responseBody: any;
  responseHeaders: Record<string, string>;
  timestamp: Date;
}

export class IdempotencyService {
  private cache: Map<string, IdempotencyRecord>;
  private ttlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) { // 24 hours default
    this.cache = new Map();
    this.ttlMs = ttlMs;

    // Cleanup expired records every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Generate hash of request body for comparison
   */
  private hashRequest(body: any): string {
    const bodyString = JSON.stringify(body);
    return crypto.createHash('sha256').update(bodyString).digest('hex');
  }

  /**
   * Check if request is idempotent and return cached response if available
   * Returns null if this is a new request
   * Throws error if idempotency key exists with different body
   */
  check(idempotencyKey: string, requestBody: any): IdempotencyRecord | null {
    const record = this.cache.get(idempotencyKey);

    if (!record) {
      return null; // New request
    }

    // Check if record has expired
    const age = Date.now() - record.timestamp.getTime();
    if (age > this.ttlMs) {
      this.cache.delete(idempotencyKey);
      return null;
    }

    // Check if request body matches
    const currentHash = this.hashRequest(requestBody);
    if (currentHash !== record.requestHash) {
      throw new Error('request_not_idempotent');
    }

    // Return cached response
    return record;
  }

  /**
   * Save response for future idempotent requests
   */
  save(
    idempotencyKey: string,
    requestBody: any,
    responseStatus: number,
    responseBody: any,
    responseHeaders: Record<string, string>
  ): void {
    const requestHash = this.hashRequest(requestBody);

    this.cache.set(idempotencyKey, {
      requestHash,
      responseStatus,
      responseBody,
      responseHeaders,
      timestamp: new Date(),
    });
  }

  /**
   * Clean up expired records
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, record] of this.cache.entries()) {
      const age = now - record.timestamp.getTime();
      if (age > this.ttlMs) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired idempotency records`);
    }
  }

  /**
   * Get cache size (for debugging)
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}