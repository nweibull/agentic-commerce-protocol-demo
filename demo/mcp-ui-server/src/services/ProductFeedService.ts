import { Product } from '../demo_data.js';

/**
 * Service to cache and retrieve the merchant's product catalog
 */
export class ProductFeedService {
  private products: Map<string, Product> = new Map();
  private merchantBaseUrl: string;
  private merchantApiKey: string;
  private initialized: boolean = false;

  constructor(
    merchantBaseUrl: string = process.env.MERCHANT_BASE_URL || 'http://localhost:3000',
    merchantApiKey: string = process.env.MERCHANT_API_KEY || 'test_api_key_123'
  ) {
    this.merchantBaseUrl = merchantBaseUrl;
    this.merchantApiKey = merchantApiKey;
  }

  /**
   * Initialize the catalog by fetching all products from merchant
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const maxRetries = 10;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching product catalog from merchant... (attempt ${attempt}/${maxRetries})`);
        const response = await fetch(`${this.merchantBaseUrl}/products`, {
          headers: {
            'Authorization': `Bearer ${this.merchantApiKey}`,
            'api-version': process.env.MERCHANT_API_VERSION || '2025-09-29'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format: expected object');
        }

        if (!Array.isArray(data.products)) {
          console.log('data.products type:', typeof data.products);
          console.log('data.products value:', JSON.stringify(data.products).substring(0, 200));
          throw new Error(`Invalid response format: products is not an array (got ${typeof data.products})`);
        }

        const products = data.products as Product[];

        // Cache all products by ID
        products.forEach(product => {
          this.products.set(product.id, product);
        });

        console.log(`✓ Cached ${this.products.size} products from merchant`);
        this.initialized = true;
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error('Failed to initialize product catalog after all retries:', error);
          throw error;
        }

        // Wait before retrying
        console.log(`Merchant not ready yet, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Get a product by ID from cache
   */
  getProduct(id: string): Product | undefined {
    return this.products.get(id);
  }

  /**
   * Get multiple products by IDs
   */
  getProducts(ids: string[]): Product[] {
    return ids
      .map(id => this.products.get(id))
      .filter((p): p is Product => p !== undefined);
  }

  /**
   * Get all products
   */
  getAllProducts(): Product[] {
    return Array.from(this.products.values());
  }

  /**
   * Check if a product exists
   */
  hasProduct(id: string): boolean {
    return this.products.has(id);
  }
}
