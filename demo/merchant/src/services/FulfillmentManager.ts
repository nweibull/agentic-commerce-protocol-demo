/**
 * Fulfillment options management service
 */

import { Address, FulfillmentOption, FulfillmentOptionShipping, FulfillmentOptionDigital } from '../models/types';
import { PricingCalculator } from './PricingCalculator';

export class FulfillmentManager {
  private pricingCalculator: PricingCalculator;

  constructor(pricingCalculator: PricingCalculator) {
    this.pricingCalculator = pricingCalculator;
  }

  /**
   * Generate fulfillment options based on cart contents and address
   */
  generateOptions(requiresShipping: boolean, address?: Address): FulfillmentOption[] {
    const options: FulfillmentOption[] = [];

    if (requiresShipping) {
      if (!address) {
        // Cannot generate shipping options without an address
        return [];
      }

      // Standard shipping
      const standardShippingCost = 500; // $5.00
      const standardTax = this.pricingCalculator.calculateTax(standardShippingCost, address);
      const standardTotal = standardShippingCost + standardTax;

      const earliestStandard = new Date();
      earliestStandard.setDate(earliestStandard.getDate() + 4);
      const latestStandard = new Date();
      latestStandard.setDate(latestStandard.getDate() + 5);

      options.push({
        type: 'shipping',
        id: 'standard_shipping',
        title: 'Standard Shipping',
        subtitle: '4-5 business days',
        carrier: 'USPS',
        earliest_delivery_time: earliestStandard.toISOString(),
        latest_delivery_time: latestStandard.toISOString(),
        subtotal: standardShippingCost,
        tax: standardTax,
        total: standardTotal,
      } as FulfillmentOptionShipping);

      // Express shipping
      const expressShippingCost = 1500; // $15.00
      const expressTax = this.pricingCalculator.calculateTax(expressShippingCost, address);
      const expressTotal = expressShippingCost + expressTax;

      const earliestExpress = new Date();
      earliestExpress.setDate(earliestExpress.getDate() + 1);
      const latestExpress = new Date();
      latestExpress.setDate(latestExpress.getDate() + 2);

      options.push({
        type: 'shipping',
        id: 'express_shipping',
        title: 'Express Shipping',
        subtitle: '1-2 business days',
        carrier: 'FedEx',
        earliest_delivery_time: earliestExpress.toISOString(),
        latest_delivery_time: latestExpress.toISOString(),
        subtotal: expressShippingCost,
        tax: expressTax,
        total: expressTotal,
      } as FulfillmentOptionShipping);
    } else {
      // Digital delivery - no shipping required
      options.push({
        type: 'digital',
        id: 'digital_delivery',
        title: 'Digital Delivery',
        subtitle: 'Instant access',
        subtotal: 0,
        tax: 0,
        total: 0,
      } as FulfillmentOptionDigital);
    }

    return options;
  }

  /**
   * Select default fulfillment option (cheapest available)
   */
  selectDefaultOption(options: FulfillmentOption[]): string | undefined {
    if (options.length === 0) return undefined;

    // Return the first option (cheapest) by default
    return options[0].id;
  }

  /**
   * Get fulfillment cost in cents from option ID
   */
  getFulfillmentCost(optionId: string | undefined, options: FulfillmentOption[]): number {
    if (!optionId) return 0;

    const option = options.find((opt) => opt.id === optionId);
    if (!option) return 0;

    // Subtotal is already in cents (integer)
    return option.subtotal;
  }

  /**
   * Validate that the fulfillment option exists in available options
   */
  validateOption(optionId: string, options: FulfillmentOption[]): boolean {
    return options.some((opt) => opt.id === optionId);
  }
}