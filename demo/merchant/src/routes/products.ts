/**
 * Product routes
 */

import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  // GET /products/categories - Must come before /:id route
  router.get('/products/categories', controller.getCategories);

  // GET /products - List all products
  router.get('/products', controller.listProducts);

  // GET /products/:id - Get product by ID
  router.get('/products/:id', controller.getProduct);

  return router;
}