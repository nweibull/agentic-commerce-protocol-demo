/**
 * Product Feed Generator Service
 * Converts internal Product models to OpenAI Product Feed format
 */

import { Product, ProductCatalog } from '../models/product';
import { ProductFeedItem, ProductFeed } from '../models/productFeed';

export class ProductFeedGenerator {
  private productCatalog: ProductCatalog;
  private baseUrl: string;

  constructor(productCatalog: ProductCatalog, baseUrl: string = 'https://merchant.example.com') {
    this.productCatalog = productCatalog;
    this.baseUrl = baseUrl;
  }

  /**
   * Convert internal Product to OpenAI Product Feed format
   */
  private productToFeedItem(product: Product): ProductFeedItem {
    return {
      // Control flags
      enable_search: true,
      enable_checkout: product.available_quantity > 0, // Only if in stock

      // Basic data
      id: product.id,
      title: product.name,
      description: product.description,
      link: `${this.baseUrl}/products/${product.id}`,

      // Classification
      condition: product.condition || 'new',
      product_category: product.category,
      brand: product.brand,
      weight: product.weight,

      // Media
      image_link: product.image_url,
      additional_image_link: product.additional_images,

      // Pricing - Convert cents to "XX.XX USD" format
      price: this.formatPrice(product.base_price),

      // Availability
      availability: product.available_quantity > 0 ? 'in_stock' : 'out_of_stock',
      inventory_quantity: product.available_quantity,

      // Merchant info
      seller_name: 'Example Store',
      seller_url: this.baseUrl,
      seller_privacy_policy: `${this.baseUrl}/privacy`,
      seller_tos: `${this.baseUrl}/terms`,

      // Returns
      return_policy: `${this.baseUrl}/returns`,
      return_window: 30,

      // Shipping
      shipping: product.requires_shipping ? product.shipping_info || 'US::Standard:5.00 USD' : undefined,

      // Reviews
      review_count: product.review_count,
      review_rating: product.review_rating,

      // Additional identifiers
      gtin: product.gtin,
      mpn: product.mpn,
      material: product.material,
    };
  }

  /**
   * Convert cents to "XX.XX USD" format
   */
  private formatPrice(cents: number): string {
    const dollars = (cents / 100).toFixed(2);
    return `${dollars} USD`;
  }

  /**
   * Generate complete feed as array
   */
  async generateFeed(): Promise<ProductFeed> {
    const products = await this.productCatalog.getAllProducts();
    return products.map((product) => this.productToFeedItem(product));
  }

  /**
   * Generate feed as JSON string
   */
  async generateJSON(): Promise<string> {
    const feed = await this.generateFeed();
    return JSON.stringify(feed, null, 2);
  }

  /**
   * Generate feed as CSV
   */
  async generateCSV(): Promise<string> {
    const feed = await this.generateFeed();
    if (feed.length === 0) return '';

    // Get all keys from first item
    const headers = Object.keys(feed[0]);
    const rows = feed.map((item) =>
      headers
        .map((key) => {
          const value = item[key as keyof ProductFeedItem];
          // Handle arrays and objects
          if (Array.isArray(value)) return `"${value.join('|')}"`;
          if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
          // Escape quotes in CSV
          if (value === undefined || value === null) return '""';
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate feed as XML
   */
  async generateXML(): Promise<string> {
    const feed = await this.generateFeed();

    const items = feed
      .map(
        (item) => `
    <item>
      <id>${this.escapeXml(item.id)}</id>
      <title>${this.escapeXml(item.title)}</title>
      <description>${this.escapeXml(item.description)}</description>
      <link>${this.escapeXml(item.link)}</link>
      <image_link>${this.escapeXml(item.image_link)}</image_link>
      <price>${this.escapeXml(item.price)}</price>
      <availability>${this.escapeXml(item.availability)}</availability>
      <brand>${this.escapeXml(item.brand)}</brand>
      <product_category>${this.escapeXml(item.product_category)}</product_category>
      <enable_search>${item.enable_search}</enable_search>
      <enable_checkout>${item.enable_checkout}</enable_checkout>
      <seller_name>${this.escapeXml(item.seller_name)}</seller_name>
      <seller_url>${this.escapeXml(item.seller_url)}</seller_url>
      <inventory_quantity>${item.inventory_quantity}</inventory_quantity>
      ${item.condition ? `<condition>${this.escapeXml(item.condition)}</condition>` : ''}
      ${item.weight ? `<weight>${this.escapeXml(item.weight)}</weight>` : ''}
      ${item.shipping ? `<shipping>${this.escapeXml(item.shipping)}</shipping>` : ''}
    </item>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<products>
${items}
</products>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string | undefined): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Validate feed and return statistics and issues
   */
  async validateFeed(): Promise<{
    total_products: number;
    searchable: number;
    purchasable: number;
    in_stock: number;
    out_of_stock: number;
    sample_product: ProductFeedItem | null;
    issues: string[];
  }> {
    const feed = await this.generateFeed();

    const validation = {
      total_products: feed.length,
      searchable: feed.filter((p) => p.enable_search).length,
      purchasable: feed.filter((p) => p.enable_checkout).length,
      in_stock: feed.filter((p) => p.availability === 'in_stock').length,
      out_of_stock: feed.filter((p) => p.availability === 'out_of_stock').length,
      sample_product: feed[0] || null,
      issues: [] as string[],
    };

    feed.forEach((product) => {
      // Check title length
      if (product.title.length > 150) {
        validation.issues.push(`Product ${product.id}: title exceeds 150 characters`);
      }

      // Check description length
      if (product.description.length > 5000) {
        validation.issues.push(`Product ${product.id}: description exceeds 5000 characters`);
      }

      // Check price format
      if (!product.price.includes('USD')) {
        validation.issues.push(`Product ${product.id}: price missing currency code`);
      }

      // Check image URL
      if (!product.image_link.startsWith('http://') && !product.image_link.startsWith('https://')) {
        validation.issues.push(`Product ${product.id}: invalid image URL`);
      }

      // Check enable_checkout consistency
      if (product.inventory_quantity === 0 && product.enable_checkout) {
        validation.issues.push(
          `Product ${product.id}: enable_checkout should be false when inventory is 0`
        );
      }

      // Check availability consistency
      if (product.inventory_quantity === 0 && product.availability !== 'out_of_stock') {
        validation.issues.push(
          `Product ${product.id}: availability should be out_of_stock when inventory is 0`
        );
      }
    });

    return validation;
  }
}