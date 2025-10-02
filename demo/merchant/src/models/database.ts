/**
 * Database models and schemas for PostgreSQL
 */

export interface DbCheckoutSession {
  id: string;
  buyer_first_name?: string;
  buyer_last_name?: string;
  buyer_email?: string;
  buyer_phone_number?: string;
  status: string;
  currency: string;
  fulfillment_address?: string; // JSON
  fulfillment_option_id?: string;
  order_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbLineItem {
  id: string;
  session_id: string;
  item_id: string;
  quantity: number;
  base_amount: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  created_at: Date;
}

export interface DbOrder {
  id: string;
  checkout_session_id: string;
  permalink_url: string;
  payment_token: string;
  payment_provider: string;
  billing_address?: string; // JSON
  created_at: Date;
}

export const DB_SCHEMA = `
-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL,
  requires_shipping BOOLEAN NOT NULL DEFAULT true,
  category VARCHAR(255),
  brand VARCHAR(255),
  weight VARCHAR(50),
  image_url TEXT,
  additional_images JSONB,
  condition VARCHAR(50),
  material VARCHAR(255),
  gtin VARCHAR(100),
  mpn VARCHAR(100),
  review_count INTEGER DEFAULT 0,
  review_rating DECIMAL(3,2),
  shipping_info VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Checkout Sessions Table
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id VARCHAR(255) PRIMARY KEY,
  buyer_first_name VARCHAR(255),
  buyer_last_name VARCHAR(255),
  buyer_email VARCHAR(255),
  buyer_phone_number VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  fulfillment_address TEXT,
  fulfillment_option_id VARCHAR(255),
  order_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Line Items Table
CREATE TABLE IF NOT EXISTS line_items (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL REFERENCES checkout_sessions(id) ON DELETE CASCADE,
  item_id VARCHAR(255) NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  base_amount INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL,
  tax INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(255) PRIMARY KEY,
  checkout_session_id VARCHAR(255) NOT NULL REFERENCES checkout_sessions(id),
  permalink_url TEXT NOT NULL,
  payment_token TEXT NOT NULL,
  payment_provider VARCHAR(50) NOT NULL,
  billing_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_line_items_session_id ON line_items(session_id);
CREATE INDEX IF NOT EXISTS idx_line_items_item_id ON line_items(item_id);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON checkout_sessions(buyer_email);
`;