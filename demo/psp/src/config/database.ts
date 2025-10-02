import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'acp_psp',
});

export const initDatabase = async () => {
  const client = await pool.connect();
  try {
    // Create vault_tokens table
    // Stores payment method details securely with vault token ID
    await client.query(`
      CREATE TABLE IF NOT EXISTS vault_tokens (
        id VARCHAR(255) PRIMARY KEY,
        created TIMESTAMPTZ NOT NULL,
        payment_method JSONB NOT NULL,
        allowance JSONB NOT NULL,
        billing_address JSONB,
        risk_signals JSONB NOT NULL,
        metadata JSONB NOT NULL,
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        request_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create idempotency_store table
    // Ensures idempotent request handling
    await client.query(`
      CREATE TABLE IF NOT EXISTS idempotency_store (
        idempotency_key VARCHAR(255) PRIMARY KEY,
        request_hash TEXT NOT NULL,
        response_status INT NOT NULL,
        response_body JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create payment_intents table
    // Tracks payment processing and completion
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        id VARCHAR(255) PRIMARY KEY,
        vault_token_id VARCHAR(255) NOT NULL REFERENCES vault_tokens(id),
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        amount INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL,
        merchant_id VARCHAR(255),
        metadata JSONB,
        created TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
