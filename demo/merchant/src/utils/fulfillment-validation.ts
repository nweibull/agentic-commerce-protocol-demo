/**
 * Fulfillment options validation utilities
 */

import { FulfillmentOption, FulfillmentOptionShipping, FulfillmentOptionDigital } from '../models/types';

/**
 * Validate fulfillment option structure
 */
export function validateFulfillmentOption(
  option: FulfillmentOption
): { valid: boolean; error?: string } {
  // Validate required fields for all types
  if (!option.id) {
    return { valid: false, error: 'Fulfillment option must have an id' };
  }

  if (!option.title) {
    return { valid: false, error: 'Fulfillment option must have a title' };
  }

  if (option.subtotal === undefined || option.subtotal === null) {
    return { valid: false, error: 'Fulfillment option must have a subtotal' };
  }

  if (option.tax === undefined || option.tax === null) {
    return { valid: false, error: 'Fulfillment option must have a tax' };
  }

  if (option.total === undefined || option.total === null) {
    return { valid: false, error: 'Fulfillment option must have a total' };
  }

  // Validate total = subtotal + tax
  const expectedTotal = option.subtotal + option.tax;
  if (option.total !== expectedTotal) {
    return {
      valid: false,
      error: `Fulfillment option ${option.id}: total (${option.total}) must equal subtotal (${option.subtotal}) + tax (${option.tax}) = ${expectedTotal}`,
    };
  }

  // Type-specific validation
  if (option.type === 'shipping') {
    return validateShippingOption(option as FulfillmentOptionShipping);
  }

  if (option.type === 'digital') {
    return validateDigitalOption(option as FulfillmentOptionDigital);
  }

  return { valid: false, error: `Unknown fulfillment option type: ${(option as any).type}` };
}

/**
 * Validate shipping fulfillment option
 */
function validateShippingOption(
  option: FulfillmentOptionShipping
): { valid: boolean; error?: string } {
  if (!option.carrier) {
    return { valid: false, error: `Shipping option ${option.id} must have a carrier` };
  }

  if (!option.earliest_delivery_time) {
    return {
      valid: false,
      error: `Shipping option ${option.id} must have earliest_delivery_time`,
    };
  }

  if (!option.latest_delivery_time) {
    return {
      valid: false,
      error: `Shipping option ${option.id} must have latest_delivery_time`,
    };
  }

  // Validate delivery times are valid ISO 8601 dates
  try {
    const earliest = new Date(option.earliest_delivery_time);
    const latest = new Date(option.latest_delivery_time);

    if (isNaN(earliest.getTime())) {
      return {
        valid: false,
        error: `Shipping option ${option.id}: earliest_delivery_time must be a valid ISO 8601 date`,
      };
    }

    if (isNaN(latest.getTime())) {
      return {
        valid: false,
        error: `Shipping option ${option.id}: latest_delivery_time must be a valid ISO 8601 date`,
      };
    }

    if (earliest.getTime() > latest.getTime()) {
      return {
        valid: false,
        error: `Shipping option ${option.id}: earliest_delivery_time must be before latest_delivery_time`,
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: `Shipping option ${option.id}: invalid delivery time format`,
    };
  }

  return { valid: true };
}

/**
 * Validate digital fulfillment option
 */
function validateDigitalOption(
  _option: FulfillmentOptionDigital
): { valid: boolean; error?: string } {
  // Digital options don't require delivery times
  // Just validate common fields (already done in parent function)
  return { valid: true };
}

/**
 * Validate that all fulfillment option IDs are unique
 */
export function validateUniqueOptionIds(
  options: FulfillmentOption[]
): { valid: boolean; error?: string } {
  const ids = new Set<string>();

  for (const option of options) {
    if (ids.has(option.id)) {
      return {
        valid: false,
        error: `Duplicate fulfillment option ID: ${option.id}`,
      };
    }
    ids.add(option.id);
  }

  return { valid: true };
}

/**
 * Validate all fulfillment options
 */
export function validateAllFulfillmentOptions(
  options: FulfillmentOption[]
): { valid: boolean; error?: string } {
  // Check for unique IDs
  const uniqueCheck = validateUniqueOptionIds(options);
  if (!uniqueCheck.valid) {
    return uniqueCheck;
  }

  // Validate each option
  for (const option of options) {
    const validation = validateFulfillmentOption(option);
    if (!validation.valid) {
      return validation;
    }
  }

  return { valid: true };
}