/**
 * Product catalog controller
 */

import { Request, Response } from 'express';
import { ProductCatalog } from '../models/product';

export class ProductController {
  private catalog: ProductCatalog;

  constructor(pool?: any) {
    this.catalog = new ProductCatalog(pool);
  }

  /**
   * GET /products
   * List all products
   */
  listProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q as string | undefined;
      const products = await this.catalog.getAllProducts();

      // Filter by search query if provided
      let filteredProducts = products;
      if (query) {
        const searchTerm = query.toLowerCase();
        filteredProducts = products.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm)
        );
      }

      res.status(200).json({
        products: filteredProducts,
        total: filteredProducts.length,
      });
    } catch (error) {
      console.error('Error listing products:', error);
      res.status(500).json({
        type: 'service_unavailable',
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to list products',
      });
    }
  };

  /**
   * GET /products/:id
   * Get product by ID
   */
  getProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = req.params.id;
      const product = await this.catalog.getProduct(productId);

      if (!product) {
        res.status(404).json({
          type: 'invalid_request',
          code: 'product_not_found',
          message: 'Product not found',
        });
        return;
      }

      res.status(200).json(product);
    } catch (error) {
      console.error('Error getting product:', error);
      res.status(500).json({
        type: 'service_unavailable',
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to get product',
      });
    }
  };

  /**
   * GET /products/categories
   * Get product categories
   */
  getCategories = async (_req: Request, res: Response): Promise<void> => {
    try {
      const products = this.catalog.getAllProducts();

      // Categorize products
      const physical = products.filter(p => p.requires_shipping);
      const digital = products.filter(p => !p.requires_shipping);

      res.status(200).json({
        categories: [
          {
            id: 'physical',
            name: 'Physical Products',
            count: physical.length,
          },
          {
            id: 'digital',
            name: 'Digital Products',
            count: digital.length,
          },
        ],
      });
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        type: 'service_unavailable',
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to get categories',
      });
    }
  };
}