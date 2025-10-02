import crypto from 'crypto';
import pool from '../config/database';

export interface IdempotencyRecord {
  idempotency_key: string;
  request_hash: string;
  response_status: number;
  response_body: any;
}

export class IdempotencyService {
  /**
   * Generate a hash of the request body for comparison
   * Uses deterministic JSON serialization
   */
  private static generateRequestHash(body: any): string {
    // Recursively sort object keys for deterministic hashing
    const sortObject = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sortObject);
      return Object.keys(obj)
        .sort()
        .reduce((result: any, key: string) => {
          result[key] = sortObject(obj[key]);
          return result;
        }, {});
    };

    const canonical = JSON.stringify(sortObject(body));
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Check if an idempotency key exists and return stored response if identical
   * Returns null if key doesn't exist
   * Throws error if key exists with different request parameters
   */
  static async checkIdempotency(
    idempotencyKey: string,
    requestBody: any
  ): Promise<{ status: number; body: any } | null> {
    const requestHash = this.generateRequestHash(requestBody);

    const result = await pool.query(
      'SELECT request_hash, response_status, response_body FROM idempotency_store WHERE idempotency_key = $1',
      [idempotencyKey]
    );

    if (result.rows.length === 0) {
      return null; // New request
    }

    const stored = result.rows[0];

    // Check if request parameters match
    if (stored.request_hash !== requestHash) {
      // Idempotency conflict - same key, different parameters
      throw {
        status: 409,
        body: {
          type: 'idempotency_conflict',
          code: 'idempotency_conflict',
          message: 'Idempotency key used with different parameters',
        },
      };
    }

    // Return cached response
    return {
      status: stored.response_status,
      body: stored.response_body,
    };
  }

  /**
   * Store the response for future idempotency checks
   */
  static async storeResponse(
    idempotencyKey: string,
    requestBody: any,
    responseStatus: number,
    responseBody: any
  ): Promise<void> {
    const requestHash = this.generateRequestHash(requestBody);

    await pool.query(
      `INSERT INTO idempotency_store (idempotency_key, request_hash, response_status, response_body)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [idempotencyKey, requestHash, responseStatus, responseBody]
    );
  }
}
