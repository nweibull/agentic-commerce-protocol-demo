/**
 * Validation utilities for totals calculation
 */

import { LineItem, Total } from '../models/types';

/**
 * Validate line item calculations
 */
export function validateLineItem(lineItem: LineItem): { valid: boolean; error?: string } {
  // Line item subtotal must equal: base_amount - discount
  const expectedSubtotal = lineItem.base_amount - lineItem.discount;
  if (lineItem.subtotal !== expectedSubtotal) {
    return {
      valid: false,
      error: `Line item ${lineItem.id}: subtotal (${lineItem.subtotal}) must equal base_amount (${lineItem.base_amount}) - discount (${lineItem.discount}) = ${expectedSubtotal}`,
    };
  }

  // Line item total must equal: base_amount - discount + tax
  const expectedTotal = lineItem.base_amount - lineItem.discount + lineItem.tax;
  if (lineItem.total !== expectedTotal) {
    return {
      valid: false,
      error: `Line item ${lineItem.id}: total (${lineItem.total}) must equal base_amount (${lineItem.base_amount}) - discount (${lineItem.discount}) + tax (${lineItem.tax}) = ${expectedTotal}`,
    };
  }

  return { valid: true };
}

/**
 * Validate totals array calculations
 */
export function validateTotals(
  lineItems: LineItem[],
  totals: Total[]
): { valid: boolean; error?: string } {
  // Extract totals by type
  const totalsMap: Record<string, number> = {};
  for (const total of totals) {
    totalsMap[total.type] = total.amount;
  }

  // Calculate expected items_base_amount
  const expectedItemsBaseAmount = lineItems.reduce((sum, item) => sum + item.base_amount, 0);
  if (totalsMap['items_base_amount'] !== expectedItemsBaseAmount) {
    return {
      valid: false,
      error: `items_base_amount (${totalsMap['items_base_amount']}) must equal sum of line items base_amount (${expectedItemsBaseAmount})`,
    };
  }

  // Calculate expected items_discount
  const expectedItemsDiscount = lineItems.reduce((sum, item) => sum + item.discount, 0);
  if (expectedItemsDiscount > 0 && totalsMap['items_discount'] !== -expectedItemsDiscount) {
    return {
      valid: false,
      error: `items_discount (${totalsMap['items_discount']}) must equal negative sum of line items discount (-${expectedItemsDiscount})`,
    };
  }

  // Validate subtotal = items_base_amount - items_discount
  const expectedSubtotal = expectedItemsBaseAmount - expectedItemsDiscount;
  if (totalsMap['subtotal'] !== expectedSubtotal) {
    return {
      valid: false,
      error: `subtotal (${totalsMap['subtotal']}) must equal items_base_amount (${expectedItemsBaseAmount}) - items_discount (${expectedItemsDiscount}) = ${expectedSubtotal}`,
    };
  }

  // Validate total = subtotal - discount + fulfillment + tax + fee
  const discount = totalsMap['discount'] || 0;
  const fulfillment = totalsMap['fulfillment'] || 0;
  const tax = totalsMap['tax'] || 0;
  const fee = totalsMap['fee'] || 0;

  const expectedTotal = totalsMap['subtotal'] - discount + fulfillment + tax + fee;
  if (totalsMap['total'] !== expectedTotal) {
    return {
      valid: false,
      error: `total (${totalsMap['total']}) must equal subtotal (${totalsMap['subtotal']}) - discount (${discount}) + fulfillment (${fulfillment}) + tax (${tax}) + fee (${fee}) = ${expectedTotal}`,
    };
  }

  return { valid: true };
}

/**
 * Validate all line items and totals in a checkout session
 */
export function validateSessionCalculations(
  lineItems: LineItem[],
  totals: Total[]
): { valid: boolean; error?: string } {
  // Validate each line item
  for (const lineItem of lineItems) {
    const lineItemValidation = validateLineItem(lineItem);
    if (!lineItemValidation.valid) {
      return lineItemValidation;
    }
  }

  // Validate totals
  return validateTotals(lineItems, totals);
}