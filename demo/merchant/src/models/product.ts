/**
 * Product catalog and inventory models
 */

export interface Product {
  // Core fields (for checkout logic)
  id: string;
  name: string;
  description: string;
  base_price: number; // in cents
  available_quantity: number;
  requires_shipping: boolean;

  // Additional fields for Product Feed
  category: string;
  brand: string;
  weight?: string;
  image_url: string;
  additional_images?: string[];
  condition?: 'new' | 'refurbished' | 'used';
  material?: string;
  gtin?: string; // UPC/EAN/ISBN
  mpn?: string; // Manufacturer Part Number

  // Reviews (optional)
  review_count?: number;
  review_rating?: number; // 0-5

  // Shipping
  shipping_info?: string;
}

export class ProductCatalog {
  private pool: any;

  constructor(pool: any) {
    this.pool = pool;
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        base_price: row.base_price,
        available_quantity: row.available_quantity,
        requires_shipping: row.requires_shipping,
        category: row.category,
        brand: row.brand,
        weight: row.weight,
        image_url: row.image_url,
        additional_images: row.additional_images ? JSON.parse(row.additional_images) : undefined,
        condition: row.condition,
        material: row.material,
        gtin: row.gtin,
        mpn: row.mpn,
        review_count: row.review_count,
        review_rating: row.review_rating,
        shipping_info: row.shipping_info,
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      const result = await this.pool.query('SELECT * FROM products');
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        base_price: row.base_price,
        available_quantity: row.available_quantity,
        requires_shipping: row.requires_shipping,
        category: row.category,
        brand: row.brand,
        weight: row.weight,
        image_url: row.image_url,
        additional_images: row.additional_images ? JSON.parse(row.additional_images) : undefined,
        condition: row.condition,
        material: row.material,
        gtin: row.gtin,
        mpn: row.mpn,
        review_count: row.review_count,
        review_rating: row.review_rating,
        shipping_info: row.shipping_info,
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async checkAvailability(id: string, quantity: number): Promise<boolean> {
    const product = await this.getProduct(id);
    if (!product) return false;
    return product.available_quantity >= quantity;
  }
}