/**
 * Database connection and configuration
 */

import { Pool } from 'pg';
import { DB_SCHEMA } from '../models/database';
import productsJson from '../data/products.json';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'acp_merchant',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function seedProducts(): Promise<void> {
  const pool = getPool();

  try {
    // Use only products from JSON file
    const products = productsJson as any[];

    for (const product of products) {
      await pool.query(
        `INSERT INTO products (
          id, name, description, base_price, available_quantity, requires_shipping,
          category, brand, weight, image_url, additional_images, condition,
          material, gtin, mpn, review_count, review_rating, shipping_info
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          base_price = EXCLUDED.base_price,
          available_quantity = EXCLUDED.available_quantity,
          requires_shipping = EXCLUDED.requires_shipping,
          category = EXCLUDED.category,
          brand = EXCLUDED.brand,
          weight = EXCLUDED.weight,
          image_url = EXCLUDED.image_url,
          additional_images = EXCLUDED.additional_images,
          condition = EXCLUDED.condition,
          material = EXCLUDED.material,
          gtin = EXCLUDED.gtin,
          mpn = EXCLUDED.mpn,
          review_count = EXCLUDED.review_count,
          review_rating = EXCLUDED.review_rating,
          shipping_info = EXCLUDED.shipping_info,
          updated_at = CURRENT_TIMESTAMP`,
        [
          product.id,
          product.name,
          product.description,
          product.base_price,
          product.available_quantity,
          product.requires_shipping,
          product.category,
          product.brand,
          product.weight || null,
          product.image_url,
          product.additional_images ? JSON.stringify(product.additional_images) : null,
          product.condition || null,
          product.material || null,
          product.gtin || null,
          product.mpn || null,
          product.review_count || 0,
          product.review_rating || null,
          product.shipping_info || null,
        ]
      );
    }

    console.log(`Seeded ${products.length} products into database`);
  } catch (error) {
    console.error('Failed to seed products:', error);
    throw error;
  }
}

export async function initializeDatabase(): Promise<void> {
  const pool = getPool();

  try {
    await pool.query(DB_SCHEMA);
    console.log('Database schema initialized successfully');

    // Seed products after schema is created
    await seedProducts();
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}