/**
 * Main routes aggregator
 */

import { Router } from 'express';
import { CheckoutController } from '../controllers/CheckoutController';
import { ProductController } from '../controllers/ProductController';
import { createCheckoutRoutes } from './checkout';
import { createProductRoutes } from './products';
import { createPaymentRoutes } from './payment';

export function createRoutes(
  checkoutController: CheckoutController,
  productController: ProductController
): Router {
  const router = Router();

  // Mount product routes
  router.use('/', createProductRoutes(productController));

  // Mount checkout routes
  router.use('/', createCheckoutRoutes(checkoutController));

  // Mount payment routes
  router.use('/', createPaymentRoutes());

  return router;
}