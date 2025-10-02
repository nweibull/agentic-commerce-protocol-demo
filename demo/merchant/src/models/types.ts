/**
 * Agentic Commerce Protocol Type Definitions
 * Based on OpenAPI spec version 2025-09-29
 */

// ============================================================================
// Request & Response Headers
// ============================================================================

/**
 * Request Headers - Headers used with all API requests
 */
export interface RequestHeaders {
    /** API Key used to make requests */
    Authorization: string;
    /** Type of request content */
    'Content-Type'?: string;
    /** The preferred locale for content like messages and errors */
    'Accept-Language'?: string;
    /** Information about the client making this request */
    'User-Agent'?: string;
    /** Key used to ensure requests are idempotent */
    'Idempotency-Key'?: string;
    /** Unique key for each request for tracing purposes */
    'Request-Id'?: string;
    /** Base64 encoded signature of the request body */
    Signature?: string;
    /** Formatted as an RFC 3339 string */
    Timestamp?: string;
    /** API version */
    'API-Version': string;
  }
  
  /**
   * Response Headers - Headers returned with all API responses
   */
  export interface ResponseHeaders {
    /** Idempotency key passed in the request */
    'Idempotency-Key'?: string;
    /** Request ID passed in the request */
    'Request-Id'?: string;
  }
  
  // ============================================================================
  // Base Object Definitions
  // ============================================================================
  
  /**
   * Address - Shipping or billing address information
   */
  export interface Address {
    /** Name of the person to whom the items are shipped */
    name: string;
    /** First line of address */
    line_one: string;
    /** Optional second line of address */
    line_two?: string;
    /** Address city/district/suburb/town/village */
    city: string;
    /** Address state/county/province/region */
    state: string;
    /** Address country */
    country: string;
    /** Address postal code or zip code */
    postal_code: string;
  }
  
  /**
   * Buyer - Information about the buyer
   */
  export interface Buyer {
    /** First name of buyer */
    first_name: string;
    /** Last name of buyer */
    last_name: string;
    /** Email address of buyer to be used for communication */
    email: string;
    /** Optional phone number of the buyer */
    phone_number?: string;
  }
  
  /**
   * Item - A piece of merchandise that can be purchased
   */
  export interface Item {
    /** Id of a piece of merchandise that can be purchased */
    id: string;
    /** Quantity of the item for fulfillment (minimum 1) */
    quantity: number;
  }
  
  /**
   * Payment provider types
   */
  export type PaymentProviderType = 'stripe';
  
  /**
   * Supported payment methods
   */
  export type PaymentMethodType = 'card';
  
  /**
   * PaymentProvider - Payment processor configuration
   */
  export interface PaymentProvider {
    /** String value representing payment processor */
    provider: PaymentProviderType;
    /** List of payment methods that the merchant is willing to accept */
    supported_payment_methods: PaymentMethodType[];
  }
  
  /**
   * LineItem - Item in a shopping cart or order
   */
  export interface LineItem {
    /** Id of the line item (different from the item id) */
    id: string;
    /** Item that is represented by the line item */
    item: Item;
    /** Integer representing item base amount before adjustments */
    base_amount: number;
    /** Integer representing any discount applied to the item */
    discount: number;
    /** Integer representing amount after all adjustments */
    subtotal: number;
    /** Integer representing tax amount */
    tax: number;
    /** Integer representing total amount */
    total: number;
  }
  
  /**
   * Total types
   */
  export type TotalType =
    | 'items_base_amount'
    | 'items_discount'
    | 'subtotal'
    | 'discount'
    | 'fulfillment'
    | 'tax'
    | 'fee'
    | 'total';
  
  /**
   * Total - Price breakdown component
   */
  export interface Total {
    /** String value representing the type of total */
    type: TotalType;
    /** The text displayed to the customer for this total */
    display_text: string;
    /** Integer representing total amount in minor units */
    amount: number;
  }
  
  /**
   * FulfillmentOption (type = shipping) - Shipping fulfillment option
   */
  export interface ShippingFulfillmentOption {
    /** String value representing the type of fulfillment option */
    type: 'shipping';
    /** Unique ID that represents the shipping option */
    id: string;
    /** Title of the shipping option to display to the customer */
    title: string;
    /** Text content describing the estimated timeline for shipping */
    subtitle?: string;
    /** Name of the shipping carrier */
    carrier?: string;
    /** Estimated earliest delivery time (RFC 3339 string) */
    earliest_delivery_time?: string;
    /** Estimated latest delivery time (RFC 3339 string) */
    latest_delivery_time?: string;
    /** Integer subtotal cost of the shipping option */
    subtotal: number;
    /** Integer representing tax amount */
    tax: number;
    /** Integer total cost of the shipping option */
    total: number;
  }

  /**
   * FulfillmentOptionShipping - Alias for ShippingFulfillmentOption (for compatibility)
   */
  export type FulfillmentOptionShipping = ShippingFulfillmentOption;
  
  /**
   * FulfillmentOption (type = digital) - Digital fulfillment option
   */
  export interface DigitalFulfillmentOption {
    /** String value representing the type of fulfillment option */
    type: 'digital';
    /** Unique ID that represents the digital option */
    id: string;
    /** Title of the digital option to display to the customer */
    title: string;
    /** Text content describing how the item will be digitally delivered */
    subtitle?: string;
    /** Integer subtotal cost of the digital option */
    subtotal: number;
    /** Integer representing tax amount */
    tax: number;
    /** Integer total cost of the digital option */
    total: number;
  }

  /**
   * FulfillmentOptionDigital - Alias for DigitalFulfillmentOption (for compatibility)
   */
  export type FulfillmentOptionDigital = DigitalFulfillmentOption;

  /**
   * FulfillmentOption - Union type of all fulfillment options
   */
  export type FulfillmentOption = ShippingFulfillmentOption | DigitalFulfillmentOption;
  
  /**
   * Message content types
   */
  export type MessageContentType = 'plain' | 'markdown';
  
  /**
   * Error codes for error messages
   */
  export type ErrorCode =
    | 'missing'
    | 'invalid'
    | 'out_of_stock'
    | 'payment_declined'
    | 'requires_sign_in'
    | 'requires_3ds';
  
  /**
   * Message (type = info) - Informational message
   */
  export interface InfoMessage {
    /** String value representing the type of message */
    type: 'info';
    /** RFC 9535 JSONPath to the component of the checkout session */
    param?: string;
    /** Type of the message content for rendering purposes */
    content_type: MessageContentType;
    /** Raw message content */
    content: string;
  }
  
  /**
   * Message (type = error) - Error message
   */
  export interface ErrorMessage {
    /** String value representing the type of message */
    type: 'error';
    /** Error code */
    code: ErrorCode;
    /** RFC 9535 JSONPath to the component of the checkout session */
    param?: string;
    /** Type of the message content for rendering purposes */
    content_type: MessageContentType;
    /** Raw message content */
    content: string;
  }
  
  /**
   * Message - Union type of all message types
   */
  export type Message = InfoMessage | ErrorMessage;
  
  /**
   * Link types
   */
  export type LinkType = 'terms_of_use' | 'privacy_policy' | 'seller_shop_policies';
  
  /**
   * Link - URL link with specific type
   */
  export interface Link {
    /** Type of the link */
    type: LinkType;
    /** Link content specified as a URL */
    url: string;
  }
  
  /**
   * PaymentData - Payment method information
   */
  export interface PaymentData {
    /** Token that represents the payment method */
    token: string;
    /** String value representing the payment processor */
    provider: PaymentProviderType;
    /** Optional billing address associated with the payment method */
    billing_address?: Address;
  }
  
  /**
   * Order - Completed order information
   */
  export interface Order {
    /** Unique id that identifies the order */
    id: string;
    /** Id that identifies the checkout session that created this order */
    checkout_session_id: string;
    /** URL that points to the order */
    permalink_url: string;
  }
  
  // ============================================================================
  // Checkout Session Types
  // ============================================================================
  
  /**
   * Checkout session status
   */
  export type CheckoutSessionStatus =
    | 'not_ready_for_payment'
    | 'ready_for_payment'
    | 'completed'
    | 'canceled'
    | 'in_progress';

  /**
   * CheckoutStatus - Alias for CheckoutSessionStatus (for compatibility)
   */
  export type CheckoutStatus = CheckoutSessionStatus;

  /**
   * CheckoutSessionBase - Base checkout session properties
   */
  export interface CheckoutSessionBase {
    /** Unique id that identifies the checkout session */
    id: string;
    /** Buyer information, if provided */
    buyer?: Buyer;
    /** Payment provider that will be used to complete this transaction */
    payment_provider?: PaymentProvider;
    /** Current status of the checkout session */
    status: CheckoutSessionStatus;
    /** Currency code as per the ISO 4217 standard (lowercase) */
    currency: string;
    /** List of items and computed costs */
    line_items: LineItem[];
    /** Address to ship items to */
    fulfillment_address?: Address;
    /** All available fulfillment options and associated costs */
    fulfillment_options: FulfillmentOption[];
    /** Id of the selected fulfillment option */
    fulfillment_option_id?: string;
    /** List of totals */
    totals: Total[];
    /** List of informational and error messages to be displayed to the customer */
    messages: Message[];
    /** List of links (e.g., TOS/privacy policy/etc.) to be displayed to the customer */
    links: Link[];
  }
  
  /**
   * CheckoutSession - Standard checkout session response
   */
  export interface CheckoutSession extends CheckoutSessionBase {
    /** Order information after completion (only present when status is 'completed') */
    order?: Order;
  }

  /**
   * CheckoutSessionWithOrder - Checkout session with completed order
   */
  export interface CheckoutSessionWithOrder extends CheckoutSessionBase {
    /** Order information after completion */
    order: Order;
  }
  
  // ============================================================================
  // API Request Types
  // ============================================================================
  
  /**
   * CheckoutSessionCreateRequest - Request to create a new checkout session
   */
  export interface CheckoutSessionCreateRequest {
    /** Optional information about the buyer */
    buyer?: Buyer;
    /** The initial list of items to initiate the checkout session (non-empty) */
    items: Item[];
    /** Optional fulfillment address if present */
    fulfillment_address?: Address;
  }
  
  /**
   * CheckoutSessionUpdateRequest - Request to update a checkout session
   */
  export interface CheckoutSessionUpdateRequest {
    /** Optional information about the buyer */
    buyer?: Buyer;
    /** Optional list of items to update */
    items?: Item[];
    /** Optional fulfillment address */
    fulfillment_address?: Address;
    /** Optional fulfillment option id to select */
    fulfillment_option_id?: string;
  }
  
  /**
   * CheckoutSessionCompleteRequest - Request to complete a checkout session
   */
  export interface CheckoutSessionCompleteRequest {
    /** Optional buyer information */
    buyer?: Buyer;
    /** Payment data required to complete the transaction */
    payment_data: PaymentData;
  }
  
  // ============================================================================
  // Error Types
  // ============================================================================
  
  /**
   * Error types
   */
  export type ErrorType =
    | 'invalid_request'
    | 'request_not_idempotent'
    | 'processing_error'
    | 'service_unavailable';
  
  /**
   * Error - API error response
   */
  export interface Error {
    /** Type of error */
    type: ErrorType;
    /** Implementation-defined error code */
    code: string;
    /** Error message */
    message: string;
    /** RFC 9535 JSONPath (optional) */
    param?: string;
  }