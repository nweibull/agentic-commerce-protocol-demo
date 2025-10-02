/**
 * Pricing calculation service
 */

import { LineItem, Total, Address, Item } from '../models/types';
import { Product } from '../models/product';
import { v4 as uuidv4 } from 'uuid';

export interface LineItemCalculation {
  base_amount: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
}

export class PricingCalculator {
  /**
   * Calculate pricing for a single line item
   */
  calculateLineItem(product: Product, quantity: number): LineItemCalculation {
    const base_amount = product.base_price * quantity;
    const discount = 0; // No discounts in MVP
    const subtotal = base_amount - discount;
    const tax = 0; // Tax calculated at order level
    const total = subtotal + tax;

    return {
      base_amount,
      discount,
      subtotal,
      tax,
      total,
    };
  }

  /**
   * Build a complete LineItem from product and quantity
   */
  buildLineItem(product: Product, item: Item): LineItem {
    const calculation = this.calculateLineItem(product, item.quantity);

    return {
      id: `li_${uuidv4()}`,
      item: {
        id: item.id,
        quantity: item.quantity,
      },
      ...calculation,
    };
  }

  /**
   * Calculate tax based on address (CA = 10%, others = 0% for MVP)
   */
  calculateTax(subtotal: number, address?: Address): number {
    if (!address) return 0;

    // California has 10% tax in this mock implementation
    if (address.state === 'CA') {
      return Math.round(subtotal * 0.10);
    }

    return 0;
  }

  /**
   * Calculate totals array for checkout session
   */
  calculateTotals(
    lineItems: LineItem[],
    fulfillmentCost: number,
    address?: Address
  ): Total[] {
    // Calculate items totals
    const items_base_amount = lineItems.reduce((sum, item) => sum + item.base_amount, 0);
    const items_discount = lineItems.reduce((sum, item) => sum + item.discount, 0);
    const subtotal = items_base_amount - items_discount;

    // Calculate tax on subtotal + fulfillment
    const taxable_amount = subtotal + fulfillmentCost;
    const tax = this.calculateTax(taxable_amount, address);

    const total = subtotal + fulfillmentCost + tax;

    const totals: Total[] = [
      {
        type: 'items_base_amount',
        display_text: 'Items Subtotal',
        amount: items_base_amount,
      },
    ];

    if (items_discount > 0) {
      totals.push({
        type: 'items_discount',
        display_text: 'Discount',
        amount: -items_discount,
      });
    }

    totals.push({
      type: 'subtotal',
      display_text: 'Subtotal',
      amount: subtotal,
    });

    if (fulfillmentCost > 0) {
      totals.push({
        type: 'fulfillment',
        display_text: 'Shipping',
        amount: fulfillmentCost,
      });
    }

    if (tax > 0) {
      totals.push({
        type: 'tax',
        display_text: 'Tax',
        amount: tax,
      });
    }

    totals.push({
      type: 'total',
      display_text: 'Total',
      amount: total,
    });

    return totals;
  }

  /**
   * Format cents as dollar string
   */
  formatCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }
}