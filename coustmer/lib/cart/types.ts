/**
 * Cart Service API types.
 * Gateway prefix: /api/v1/cart-service
 * Routes mounted at: /cart
 */

export type PaginationMeta = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

export type DeliveryType = 'delivery' | 'takeaway' | string;

export type CartModifier = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
};

export type CartLineItem = {
  /** Cart line / item row id (for PUT/DELETE) */
  id: string;
  menuItemId: string;
  name: string;
  /** Unit price including selected modifiers (for display). */
  price: number;
  /** Base menu price before modifiers (when known). */
  basePrice?: number;
  quantity: number;
  isVeg?: boolean;
  imageUrl?: string;
  specialInstructions?: string;
  restaurantId?: string;
  modifiers?: CartModifier[];
  [key: string]: unknown;
};

export type CartCoupon = {
  code: string;
  discount?: number;
  discountType?: string;
  description?: string;
  [key: string]: unknown;
};

export type CartAddress = {
  label?: string;
  formattedAddress?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactName?: string;
  contactPhone?: string;
  lat?: number;
  lng?: number;
  addressId?: string;
  [key: string]: unknown;
};

export type CartValidationIssue = {
  itemId?: string;
  menuItemId?: string;
  code?: string;
  message: string;
  severity?: 'error' | 'warning' | string;
};

export type CartValidationResult = {
  valid: boolean;
  issues: CartValidationIssue[];
  cart?: Cart;
  message?: string;
  code?: string;
};

export type CartValidatePayload = {
  dropLat?: number;
  dropLng?: number;
};

export type Cart = {
  id?: string;
  restaurantId?: string;
  restaurantName?: string;
  items: CartLineItem[];
  itemCount: number;
  subtotal: number;
  tip: number;
  discount: number;
  deliveryFee?: number;
  tax?: number;
  total: number;
  coupon?: CartCoupon | null;
  specialInstructions?: string;
  deliveryAddress?: CartAddress | null;
  deliveryType?: DeliveryType;
  scheduledFor?: string | null;
  updatedAt?: string;
  [key: string]: unknown;
};

export type SavedCart = {
  id: string;
  name?: string;
  restaurantId?: string;
  restaurantName?: string;
  itemCount?: number;
  subtotal?: number;
  items?: CartLineItem[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type AddCartItemPayload = {
  menuItemId: string;
  restaurantId: string;
  restaurantName?: string;
  name?: string;
  price?: number;
  quantity?: number;
  isVeg?: boolean;
  imageUrl?: string;
  specialInstructions?: string;
  /** Structured add-ons / size options (Half/Full, cheese, …). */
  modifiers?: CartModifier[];
};

export type UpdateCartItemPayload = {
  quantity?: number;
  specialInstructions?: string;
  options?: unknown;
};

export type ApplyCouponPayload = {
  code: string;
};

export type UpdateTipPayload = {
  tip: number;
  amount?: number;
};

export type UpdateDeliveryAddressPayload = CartAddress;

export type UpdateDeliveryTypePayload = {
  deliveryType: DeliveryType;
  type?: DeliveryType;
};

export type SaveCartPayload = {
  name?: string;
};
