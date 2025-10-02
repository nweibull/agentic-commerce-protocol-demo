import { Express } from 'express';
import { MerchantSessionService } from '../services/MerchantSessionService.js';
import { ProductFeedService } from '../services/ProductFeedService.js';
import { Logger } from '../utils/logger.js';

export function setupCartRoutes(
  app: Express,
  merchantService: MerchantSessionService,
  productFeedService: ProductFeedService,
  sessionId: string,
  port: number
) {
  // Add item to cart
  app.post('/cart/add', async (req, res) => {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    try {
      // Add item to merchant session (source of truth)
      const session = await merchantService.addItemsToCart(sessionId, [{ id: productId, quantity: 1 }]);
      Logger.sessionAction('Add to cart', sessionId, `${productId}`);

      // Extract cart items from session
      const cartItems = session.line_items.map(li => li.item.id);

      res.json({
        message: 'Product added to cart',
        cart: cartItems,
        session: session
      });
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      res.status(500).json({ error: 'Failed to add item to cart' });
    }
  });

  // Remove item from cart
  app.post('/cart/remove', async (req, res) => {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    try {
      if (!merchantService.hasActiveSession(sessionId)) {
        return res.json({ message: 'No active session', cart: [] });
      }

      const currentSession = merchantService.getActiveSession(sessionId);
      const remainingItems = currentSession!.line_items
        .filter(li => li.item.id !== productId)
        .map(li => li.item);

      if (remainingItems.length > 0) {
        // Update session with remaining items
        const session = await merchantService.updateSession(sessionId, { items: remainingItems });
        const cartItems = session.line_items.map(li => li.item.id);

        Logger.sessionAction('Remove from cart', sessionId, `${productId}`);

        res.json({
          message: 'Product removed from cart',
          cart: cartItems,
          session: session
        });
      } else {
        // If no items left, cancel the session with the merchant
        const canceledSession = await merchantService.cancelSession(sessionId);
        Logger.sessionAction('Cart emptied', sessionId, 'Session canceled');

        res.json({
          message: 'Product removed from cart',
          cart: [],
          session: canceledSession
        });
      }
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      res.status(500).json({ error: 'Failed to remove item from cart' });
    }
  });

  // Get cart contents
  app.get('/cart', (req, res) => {
    if (!merchantService.hasActiveSession(sessionId)) {
      return res.json({ cart: [], products: [], session: null });
    }

    const session = merchantService.getActiveSession(sessionId);
    const cartItems = session!.line_items.map(li => li.item.id);

    // Get full product details from product feed
    const products = productFeedService.getProducts(cartItems);

    res.json({
      cart: cartItems,
      products: products,
      session: session
    });
  });

  // Cancel checkout session
  app.post('/cart/cancel', async (req, res) => {
    try {
      if (!merchantService.hasActiveSession(sessionId)) {
        return res.json({ message: 'No active session to cancel', session: null });
      }

      const session = await merchantService.cancelSession(sessionId);
      Logger.sessionAction('Session canceled', sessionId, session.id);

      res.json({
        message: 'Checkout session canceled',
        session: session
      });
    } catch (error) {
      console.error('Failed to cancel checkout session:', error);
      res.status(500).json({ error: 'Failed to cancel checkout session' });
    }
  });

  // Update buyer info
  app.post('/checkout/buyer', async (req, res) => {
    const { buyer } = req.body;

    if (!buyer) {
      return res.status(400).json({ error: 'Buyer info is required' });
    }

    try {
      if (!merchantService.hasActiveSession(sessionId)) {
        return res.status(404).json({ error: 'No active session' });
      }

      const session = await merchantService.updateSession(sessionId, { buyer });
      Logger.sessionAction('Buyer info updated', sessionId, session.id);

      res.json({
        message: 'Buyer info updated',
        session: session
      });
    } catch (error) {
      console.error('Failed to update buyer info:', error);
      res.status(500).json({ error: 'Failed to update buyer info' });
    }
  });

  // Update shipping address
  app.post('/checkout/shipping', async (req, res) => {
    const { fulfillment_address } = req.body;

    if (!fulfillment_address) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    try {
      if (!merchantService.hasActiveSession(sessionId)) {
        return res.status(404).json({ error: 'No active session' });
      }

      const session = await merchantService.updateSession(sessionId, { fulfillment_address });
      Logger.sessionAction('Shipping address updated', sessionId, session.id);

      res.json({
        message: 'Shipping address updated',
        session: session
      });
    } catch (error) {
      console.error('Failed to update shipping address:', error);
      res.status(500).json({ error: 'Failed to update shipping address' });
    }
  });
}
