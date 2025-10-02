import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';

export interface VaultTokenData {
  payment_method: any;
  allowance: any;
  billing_address?: any;
  risk_signals: any[];
  metadata: any;
  idempotency_key: string;
  request_id: string;
}

export interface VaultTokenResponse {
  id: string;
  created: string;
  metadata: any;
}

export class VaultTokenService {
  /**
   * Generate a unique vault token ID with vt_ prefix
   */
  private static generateVaultTokenId(): string {
    const randomId = uuidv4().replace(/-/g, '').substring(0, 16);
    return `vt_${randomId}`;
  }

  /**
   * Create a new vault token
   */
  static async createVaultToken(data: VaultTokenData): Promise<VaultTokenResponse> {
    const vaultTokenId = this.generateVaultTokenId();
    const created = new Date().toISOString();

    // Store in database
    await pool.query(
      `INSERT INTO vault_tokens
       (id, created, payment_method, allowance, billing_address, risk_signals, metadata, idempotency_key, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        vaultTokenId,
        created,
        JSON.stringify(data.payment_method),
        JSON.stringify(data.allowance),
        data.billing_address ? JSON.stringify(data.billing_address) : null,
        JSON.stringify(data.risk_signals),
        JSON.stringify(data.metadata),
        data.idempotency_key,
        data.request_id,
      ]
    );

    // Build response metadata
    const responseMetadata = {
      ...data.metadata,
      idempotency_key: data.idempotency_key,
      merchant_id: data.allowance.merchant_id,
      source: data.metadata.source || 'chatgpt',
    };

    return {
      id: vaultTokenId,
      created,
      metadata: responseMetadata,
    };
  }
}
