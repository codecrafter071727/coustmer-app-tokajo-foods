/**
 * Payment Service API types.
 * Gateway prefix: /api/v1/payment-service
 * Routes mounted at: /payments
 */

export type PaginationMeta = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNext?: boolean;
};

export type PaymentStatus =
  | 'pending'
  | 'initiated'
  | 'processing'
  | 'success'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | string;

export type PaymentMethodType =
  | 'cod'
  | 'upi'
  | 'card'
  | 'wallet'
  | 'netbanking'
  | string;

export type SavedMethodType = 'card' | 'upi' | 'netbanking' | 'wallet' | string;

export type Payment = {
  id: string;
  orderId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method?: PaymentMethodType;
  methodId?: string;
  gateway?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  paymentUrl?: string;
  razorpayKey?: string;
  razorpayOrderId?: string;
  description?: string;
  failureReason?: string;
  createdAt?: string;
  updatedAt?: string;
  paidAt?: string;
  [key: string]: unknown;
};

export type PaymentListResult = {
  payments: Payment[];
  meta?: PaginationMeta;
};

export type InitiatePaymentPayload = {
  orderId: string;
  amount: number;
  currency?: string;
  method: PaymentMethodType;
  methodId?: string;
  returnUrl?: string;
  description?: string;
};

export type VerifyPaymentPayload = {
  paymentId: string;
  orderId?: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  /** Preferred by payment-service validation */
  gatewaySignature?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  signature?: string;
  status?: string;
  transactionId?: string;
};

export type SavedPaymentMethod = {
  id: string;
  type: SavedMethodType;
  label: string;
  isDefault: boolean;
  /** Masked card last4 / UPI VPA */
  last4?: string;
  brand?: string;
  upiId?: string;
  expiryMonth?: number;
  expiryYear?: number;
  createdAt?: string;
  [key: string]: unknown;
};

export type SavePaymentMethodPayload = {
  type: SavedMethodType;
  label?: string;
  /** Card token / gateway method id when available */
  token?: string;
  /** Alias expected by payment-service (`gatewayToken`) */
  gatewayToken?: string;
  cardNumber?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  cardHolderName?: string;
  upiId?: string;
  setAsDefault?: boolean;
};

export type WalletSummary = {
  balance: number;
  currency: string;
  isLocked?: boolean;
  lastCredited?: string;
  [key: string]: unknown;
};

export type WalletTopupPayload = {
  amount: number;
  method?: PaymentMethodType;
  methodId?: string;
  currency?: string;
};

export type WalletTransaction = {
  id: string;
  type?: string;
  amount: number;
  currency?: string;
  description?: string;
  status?: string;
  balanceAfter?: number;
  createdAt?: string;
  [key: string]: unknown;
};

export type WalletTransactionsResult = {
  transactions: WalletTransaction[];
  meta?: PaginationMeta;
};

export type RefundStatus =
  | 'requested'
  | 'pending'
  | 'processing'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'failed'
  | string;

export type Refund = {
  id: string;
  orderId?: string;
  paymentId?: string;
  amount: number;
  currency?: string;
  reason?: string;
  status: RefundStatus;
  createdAt?: string;
  updatedAt?: string;
  processedAt?: string;
  [key: string]: unknown;
};

export type RequestRefundPayload = {
  orderId: string;
  paymentId?: string;
  amount?: number;
  reason: string;
  type?: string;
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  initiated: 'Initiated',
  processing: 'Processing',
  success: 'Paid',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

export const REFUND_STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  pending: 'Pending',
  processing: 'Processing',
  approved: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
  failed: 'Failed',
};

export const REFUND_REASONS = [
  { value: 'order_cancelled', label: 'Order cancelled' },
  { value: 'missing_item', label: 'Missing item' },
  { value: 'wrong_order', label: 'Wrong / damaged order' },
  { value: 'quality_issue', label: 'Quality issue' },
  { value: 'late_delivery', label: 'Late delivery' },
  { value: 'duplicate_charge', label: 'Duplicate charge' },
  { value: 'other', label: 'Other' },
] as const;

export function isPaymentSuccess(status?: string) {
  const s = String(status ?? '').toLowerCase();
  return s === 'success' || s === 'paid' || s === 'captured' || s === 'completed';
}

export function needsOnlinePayment(method?: string) {
  const m = String(method ?? '').toLowerCase();
  return (
    m !== 'cod' &&
    m !== 'cash' &&
    m !== 'cash_on_delivery' &&
    m !== 'wallet' &&
    m !== 'tokajo_wallet'
  );
}
