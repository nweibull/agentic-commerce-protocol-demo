import { Request } from 'express';
import { DelegatePaymentError } from '../models/delegatePaymentTypes';

export type ValidationError = DelegatePaymentError;

export const validateRequiredHeaders = (req: Request): ValidationError | null => {
  const requiredHeaders = [
    'authorization',
    'accept-language',
    'user-agent',
    'idempotency-key',
    'request-id',
    'content-type',
    'signature',
    'timestamp',
    'api-version',
  ];

  for (const header of requiredHeaders) {
    if (!req.headers[header]) {
      return {
        type: 'invalid_request',
        code: 'missing_header',
        message: `${header.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')} header is required`,
      };
    }
  }

  // Validate Authorization format
  const authHeader = req.headers['authorization'] as string;
  if (!authHeader.startsWith('Bearer ')) {
    return {
      type: 'invalid_request',
      code: 'invalid_header',
      message: 'Authorization header must be in format: Bearer <token>',
    };
  }

  // Validate Content-Type
  if (req.headers['content-type'] !== 'application/json') {
    return {
      type: 'invalid_request',
      code: 'invalid_content_type',
      message: 'Content-Type must be application/json',
    };
  }

  // Validate Timestamp is RFC 3339
  const timestamp = req.headers['timestamp'] as string;
  try {
    new Date(timestamp);
  } catch {
    return {
      type: 'invalid_request',
      code: 'invalid_timestamp',
      message: 'Timestamp must be in RFC 3339 format',
    };
  }

  return null;
};

export const validatePaymentMethod = (paymentMethod: any): ValidationError | null => {
  if (!paymentMethod) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'payment_method is required',
      param: 'payment_method',
    };
  }

  // Validate type
  if (paymentMethod.type !== 'card') {
    return {
      type: 'invalid_request',
      code: 'invalid_payment_method_type',
      message: "Payment method type must be 'card'",
      param: 'payment_method.type',
    };
  }

  // Validate card_number_type
  if (!['fpan', 'network_token'].includes(paymentMethod.card_number_type)) {
    return {
      type: 'invalid_request',
      code: 'invalid_card_number_type',
      message: "Card number type must be 'fpan' or 'network_token'",
      param: 'payment_method.card_number_type',
    };
  }

  // Validate number is present
  if (!paymentMethod.number) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'Card number is required',
      param: 'payment_method.number',
    };
  }

  // Validate card number format (basic Luhn check for FPAN)
  if (paymentMethod.card_number_type === 'fpan') {
    const cardNumber = paymentMethod.number.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cardNumber)) {
      return {
        type: 'invalid_card',
        code: 'invalid_card',
        message: 'Card number is invalid',
        param: 'payment_method.number',
      };
    }

    // Luhn algorithm check
    let sum = 0;
    let isEven = false;
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }

    if (sum % 10 !== 0) {
      return {
        type: 'invalid_card',
        code: 'invalid_card',
        message: 'Card number is invalid',
        param: 'payment_method.number',
      };
    }
  }

  // Validate display_card_funding_type
  if (!paymentMethod.display_card_funding_type) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'display_card_funding_type is required',
      param: 'payment_method.display_card_funding_type',
    };
  }

  if (!['credit', 'debit', 'prepaid'].includes(paymentMethod.display_card_funding_type)) {
    return {
      type: 'invalid_request',
      code: 'invalid_enum_value',
      message: "Display card funding type must be 'credit', 'debit', or 'prepaid'",
      param: 'payment_method.display_card_funding_type',
    };
  }

  // Validate string lengths
  if (paymentMethod.exp_month && paymentMethod.exp_month.length > 2) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'exp_month exceeds maximum length of 2 characters',
      param: 'payment_method.exp_month',
    };
  }

  if (paymentMethod.exp_year && paymentMethod.exp_year.length > 4) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'exp_year exceeds maximum length of 4 characters',
      param: 'payment_method.exp_year',
    };
  }

  if (paymentMethod.cvc && paymentMethod.cvc.length > 4) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'cvc exceeds maximum length of 4 characters',
      param: 'payment_method.cvc',
    };
  }

  if (paymentMethod.iin && paymentMethod.iin.length > 6) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'iin exceeds maximum length of 6 characters',
      param: 'payment_method.iin',
    };
  }

  if (paymentMethod.display_last4 && paymentMethod.display_last4.length > 4) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'display_last4 exceeds maximum length of 4 characters',
      param: 'payment_method.display_last4',
    };
  }

  // Validate metadata is present
  if (paymentMethod.metadata === undefined) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'metadata is required',
      param: 'payment_method.metadata',
    };
  }

  return null;
};

export const validateAllowance = (allowance: any): ValidationError | null => {
  if (!allowance) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'allowance is required',
      param: 'allowance',
    };
  }

  // Validate reason
  if (allowance.reason !== 'one_time') {
    return {
      type: 'invalid_request',
      code: 'invalid_allowance_reason',
      message: "Allowance reason must be 'one_time'",
      param: 'allowance.reason',
    };
  }

  // Validate required fields
  if (allowance.max_amount === undefined) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'max_amount is required',
      param: 'allowance.max_amount',
    };
  }

  if (!allowance.currency) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'currency is required',
      param: 'allowance.currency',
    };
  }

  // Validate currency is lowercase ISO-4217
  if (allowance.currency !== allowance.currency.toLowerCase()) {
    return {
      type: 'invalid_request',
      code: 'invalid_currency',
      message: 'Currency must be lowercase ISO-4217 format',
      param: 'allowance.currency',
    };
  }

  if (!allowance.checkout_session_id) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'checkout_session_id is required',
      param: 'allowance.checkout_session_id',
    };
  }

  if (!allowance.merchant_id) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'merchant_id is required',
      param: 'allowance.merchant_id',
    };
  }

  // Validate merchant_id length
  if (allowance.merchant_id.length > 256) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'Merchant ID exceeds maximum length of 256 characters',
      param: 'allowance.merchant_id',
    };
  }

  if (!allowance.expires_at) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'expires_at is required',
      param: 'allowance.expires_at',
    };
  }

  // Validate expires_at is RFC 3339
  try {
    new Date(allowance.expires_at);
  } catch {
    return {
      type: 'invalid_request',
      code: 'invalid_format',
      message: 'expires_at must be in RFC 3339 format',
      param: 'allowance.expires_at',
    };
  }

  return null;
};

export const validateBillingAddress = (billingAddress: any): ValidationError | null => {
  if (!billingAddress) {
    return null; // Optional field
  }

  const requiredFields = ['name', 'line_one', 'city', 'country', 'postal_code'];
  for (const field of requiredFields) {
    if (!billingAddress[field]) {
      return {
        type: 'invalid_request',
        code: 'missing_field',
        message: `${field} is required when billing_address is provided`,
        param: `billing_address.${field}`,
      };
    }
  }

  // Validate string lengths
  if (billingAddress.name && billingAddress.name.length > 256) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'name exceeds maximum length of 256 characters',
      param: 'billing_address.name',
    };
  }

  if (billingAddress.line_one && billingAddress.line_one.length > 60) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'line_one exceeds maximum length of 60 characters',
      param: 'billing_address.line_one',
    };
  }

  if (billingAddress.line_two && billingAddress.line_two.length > 60) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'line_two exceeds maximum length of 60 characters',
      param: 'billing_address.line_two',
    };
  }

  if (billingAddress.city && billingAddress.city.length > 60) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'city exceeds maximum length of 60 characters',
      param: 'billing_address.city',
    };
  }

  if (billingAddress.postal_code && billingAddress.postal_code.length > 20) {
    return {
      type: 'invalid_request',
      code: 'field_too_long',
      message: 'postal_code exceeds maximum length of 20 characters',
      param: 'billing_address.postal_code',
    };
  }

  return null;
};

export const validateRiskSignals = (riskSignals: any): ValidationError | null => {
  if (!riskSignals) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'risk_signals is required',
      param: 'risk_signals',
    };
  }

  if (!Array.isArray(riskSignals)) {
    return {
      type: 'invalid_request',
      code: 'invalid_type',
      message: 'risk_signals must be an array',
      param: 'risk_signals',
    };
  }

  for (let i = 0; i < riskSignals.length; i++) {
    const signal = riskSignals[i];

    if (!signal.type) {
      return {
        type: 'invalid_request',
        code: 'missing_field',
        message: 'type is required in risk signal',
        param: `risk_signals[${i}].type`,
      };
    }

    if (signal.score === undefined) {
      return {
        type: 'invalid_request',
        code: 'missing_field',
        message: 'score is required in risk signal',
        param: `risk_signals[${i}].score`,
      };
    }

    if (!signal.action) {
      return {
        type: 'invalid_request',
        code: 'missing_field',
        message: 'action is required in risk signal',
        param: `risk_signals[${i}].action`,
      };
    }

    if (!['blocked', 'manual_review', 'authorized'].includes(signal.action)) {
      return {
        type: 'invalid_request',
        code: 'invalid_enum_value',
        message: "Risk signal action must be 'blocked', 'manual_review', or 'authorized'",
        param: `risk_signals[${i}].action`,
      };
    }
  }

  return null;
};

export const validateRequestBody = (body: any): ValidationError | null => {
  if (!body) {
    return {
      type: 'invalid_request',
      code: 'invalid_body',
      message: 'Request body is required',
    };
  }

  // Validate payment_method
  const pmError = validatePaymentMethod(body.payment_method);
  if (pmError) return pmError;

  // Validate allowance
  const allowanceError = validateAllowance(body.allowance);
  if (allowanceError) return allowanceError;

  // Validate billing_address (optional)
  const billingError = validateBillingAddress(body.billing_address);
  if (billingError) return billingError;

  // Validate risk_signals
  const riskError = validateRiskSignals(body.risk_signals);
  if (riskError) return riskError;

  // Validate metadata is present
  if (body.metadata === undefined) {
    return {
      type: 'invalid_request',
      code: 'missing_field',
      message: 'metadata is required',
      param: 'metadata',
    };
  }

  return null;
};
