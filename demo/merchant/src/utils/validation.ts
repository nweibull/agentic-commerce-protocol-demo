/**
 * Validation utilities for addresses, phone numbers, etc.
 */

// ISO 3166-1 alpha-2 country codes (subset for MVP)
const VALID_COUNTRY_CODES = new Set([
  'US', 'CA', 'MX', 'GB', 'DE', 'FR', 'IT', 'ES', 'AU', 'NZ', 'JP', 'CN', 'IN', 'BR'
]);

// ISO 3166-2 state codes for US
const VALID_US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC'
]);

// ISO 3166-2 province codes for Canada
const VALID_CA_PROVINCE_CODES = new Set([
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
]);

/**
 * Validate country code (ISO 3166-1 alpha-2)
 */
export function isValidCountryCode(code: string): boolean {
  return VALID_COUNTRY_CODES.has(code.toUpperCase());
}

/**
 * Validate state/province code (ISO 3166-2)
 */
export function isValidStateCode(state: string, country: string): boolean {
  const stateUpper = state.toUpperCase();
  const countryUpper = country.toUpperCase();

  if (countryUpper === 'US') {
    return VALID_US_STATE_CODES.has(stateUpper);
  }

  if (countryUpper === 'CA') {
    return VALID_CA_PROVINCE_CODES.has(stateUpper);
  }

  // For other countries, accept any 2-letter code in MVP
  return /^[A-Z]{2}$/.test(stateUpper);
}

/**
 * Validate phone number (E.164 format)
 * Format: +[country code][number]
 * Example: +15552003434
 */
export function isValidE164PhoneNumber(phone: string): boolean {
  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Validate postal code format
 * For MVP, just check it's not empty and is reasonable length
 */
export function isValidPostalCode(postalCode: string, country: string): boolean {
  const countryUpper = country.toUpperCase();

  if (countryUpper === 'US') {
    // US ZIP: 5 digits or 5+4 format
    return /^\d{5}(-\d{4})?$/.test(postalCode);
  }

  if (countryUpper === 'CA') {
    // Canadian postal code: A1A 1A1 format
    return /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(postalCode);
  }

  // For other countries, accept any string 3-10 chars
  return postalCode.length >= 3 && postalCode.length <= 10;
}

/**
 * Validate currency code (ISO 4217 in lowercase)
 */
export function isValidCurrencyCode(code: string): boolean {
  // Common currency codes in lowercase as per spec
  const validCodes = new Set(['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'cny', 'inr', 'brl', 'mxn']);
  return validCodes.has(code.toLowerCase());
}