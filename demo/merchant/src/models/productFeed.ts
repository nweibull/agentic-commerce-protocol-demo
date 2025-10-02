/**
 * OpenAI Product Feed Specification
 * Full spec: https://developers.openai.com/commerce/specs/feed/
 */

export interface ProductFeedItem {
  // OpenAI Control Flags (Required)
  enable_search: boolean; // Can appear in ChatGPT search?
  enable_checkout: boolean; // Can be purchased?

  // Basic Product Data (Required)
  id: string; // Your product ID
  title: string; // Product name (max 150 chars)
  description: string; // Full description (max 5,000 chars)
  link: string; // Product page URL

  // Classification
  condition?: string; // "new", "refurbished", "used"
  product_category: string; // e.g., "Apparel > Shoes"
  brand: string; // Brand name
  weight?: string; // e.g., "1.5 lb"

  // Media (Required)
  image_link: string; // Main image URL
  additional_image_link?: string[];

  // Pricing (Required)
  price: string; // e.g., "79.99 USD" (NOT cents!)
  sale_price?: string; // Optional sale price

  // Availability (Required)
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  inventory_quantity: number;

  // Merchant Info (Required)
  seller_name: string;
  seller_url: string;
  seller_privacy_policy: string;
  seller_tos: string;

  // Returns (Required)
  return_policy: string;
  return_window: number; // Days

  // Fulfillment
  shipping?: string; // Format: "country:region:service:price"

  // Reviews (Optional)
  review_count?: number;
  review_rating?: number;

  // Additional identifiers (Optional)
  gtin?: string;
  mpn?: string;
  material?: string;
}

export type ProductFeed = ProductFeedItem[];