/**
 * Order Service API types.
 * Gateway prefix: /api/v1/order-service
 * Routes mounted at: /orders (+ /health)
 */

export type PaginationMeta = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNext?: boolean;
};

export type OrderStatus =
  | 'pending'
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'scheduled'
  | string;

export type OrderItem = {
  id?: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  isVeg?: boolean;
  imageUrl?: string;
  specialInstructions?: string;
};

export type OrderAddress = {
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
};

export type OrderIssue = {
  id: string;
  orderId?: string;
  type: string;
  description: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type OrderTracking = {
  orderId: string;
  status?: OrderStatus;
  etaMinutes?: number;
  etaText?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveryPartnerLat?: number;
  deliveryPartnerLng?: number;
  restaurantLat?: number;
  restaurantLng?: number;
  customerLat?: number;
  customerLng?: number;
  updatedAt?: string;
  timeline?: { status: string; at?: string; label?: string }[];
  [key: string]: unknown;
};

export type OrderInvoice = {
  orderId: string;
  url?: string;
  fileName?: string;
  contentType?: string;
  message?: string;
  raw?: unknown;
};

export type Order = {
  id: string;
  orderNumber?: string;
  restaurantId?: string;
  restaurantName?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  discount?: number;
  tip?: number;
  couponCode?: string;
  total?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryAddress?: OrderAddress;
  specialInstructions?: string;
  scheduledFor?: string;
  isScheduled?: boolean;
  estimatedDeliveryAt?: string;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  raw?: Record<string, unknown>;
  [key: string]: unknown;
};

export type CreateOrderItemPayload = {
  menuItemId: string;
  name?: string;
  quantity: number;
  price?: number;
  specialInstructions?: string;
};

export type CreateOrderPayload = {
  restaurantId: string;
  restaurantName: string;
  items: CreateOrderItemPayload[];
  deliveryAddress: OrderAddress & {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    contactName: string;
    contactPhone: string;
  };
  addressId?: string;
  paymentMethod?: string;
  specialInstructions?: string;
  tip?: number;
  deliveryTip?: number;
  tipAmount?: number;
  scheduledFor?: string;
  deliveryType?: string;
  fulfillmentType?: string;
  /** Alternate shapes some backends accept */
  notes?: string;
};

export type CancelOrderPayload = {
  reason?: string;
};

export type TipPayload = {
  tip: number;
  amount?: number;
};

export type ReportIssuePayload = {
  type: string;
  description: string;
  orderId?: string;
  attachments?: string[];
};

export type OrderListResult = {
  orders: Order[];
  meta?: PaginationMeta;
};

export const ORDER_ISSUE_TYPES = [
  { value: 'missing_item', label: 'Missing item' },
  { value: 'wrong_order', label: 'Wrong order' },
  { value: 'quality_issue', label: 'Quality issue' },
  { value: 'late_delivery', label: 'Late delivery' },
  { value: 'packaging', label: 'Packaging problem' },
  { value: 'other', label: 'Other' },
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  scheduled: 'Scheduled',
};

export function normalizeOrderStatus(status?: string) {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function isScheduledOrder(order: {
  status?: string;
  isScheduled?: boolean;
  scheduledFor?: string;
}) {
  if (order.isScheduled) return true;
  if (order.scheduledFor) return true;
  return normalizeOrderStatus(order.status) === 'scheduled';
}

/** In-progress orders (not delivered / cancelled / completed). */
export function isActiveOrderStatus(status?: string) {
  if (!status) return false;
  const s = normalizeOrderStatus(status);
  return ![
    'delivered',
    'cancelled',
    'canceled',
    'completed',
    'failed',
    'rejected',
    'scheduled',
  ].includes(s);
}

export function canCancelOrder(status?: string) {
  if (!status) return false;
  const s = status.toLowerCase();
  return [
    'pending',
    'placed',
    'confirmed',
    'scheduled',
  ].includes(s);
}

export function canTipOrder(status?: string) {
  if (!status) return false;
  const s = status.toLowerCase();
  return ['pending', 'placed'].includes(s);
}

/** Delivered / completed orders can be rated. */
export function canRateOrder(status?: string) {
  if (!status) return false;
  const s = normalizeOrderStatus(status);
  return s === 'delivered' || s === 'completed';
}
