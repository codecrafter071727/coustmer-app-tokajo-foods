/**
 * Customer Help / Support types.
 * Gateway: /api/v1/customer-service/customers/support/*
 */

export const SUPPORT_CATEGORIES = [
  'missing_item',
  'wrong_item',
  'food_quality',
  'food_safety',
  'late_delivery',
  'delivery_partner_issue',
  'restaurant_issue',
  'payment_issue',
  'refund_issue',
  'coupon_issue',
  'account_issue',
  'other',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

/** Includes legacy categories that may still appear on older tickets. */
export type SupportCategoryOrLegacy =
  | SupportCategory
  | 'order_issue'
  | 'delivery_issue';

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategoryOrLegacy, string> = {
  missing_item: 'Missing item',
  wrong_item: 'Wrong item',
  food_quality: 'Food quality',
  food_safety: 'Food safety',
  late_delivery: 'Late delivery',
  delivery_partner_issue: 'Delivery partner',
  restaurant_issue: 'Restaurant issue',
  payment_issue: 'Payment issue',
  refund_issue: 'Refund issue',
  coupon_issue: 'Coupon issue',
  account_issue: 'Account issue',
  other: 'Other',
  order_issue: 'Order issue',
  delivery_issue: 'Delivery issue',
};

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_for_customer'
  | 'waiting_for_internal'
  | 'escalated'
  | 'resolved'
  | 'closed'
  | 'reopened';

export type TicketMessageSender = 'customer' | 'agent' | 'system' | string;

export type TicketMessage = {
  id: string;
  sender?: string;
  senderRole: TicketMessageSender;
  content: string;
  attachments?: string[];
  createdAt?: string;
  isRead?: boolean;
};

export type SupportTicket = {
  id: string;
  ticketNo: string;
  userId: string;
  category: SupportCategoryOrLegacy;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: string;
  orderId?: string;
  attachments: string[];
  messages: TicketMessage[];
  rating?: number;
  feedback?: string;
  resolution?: string | null;
  resolutionType?: string | null;
  refundId?: string | null;
  compensationAmount?: number | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginationMeta = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNext?: boolean;
};

export type CreateTicketPayload = {
  category: SupportCategory;
  subject: string;
  description: string;
  orderId?: string;
  attachments?: string[];
};

export type AddTicketMessagePayload = {
  content: string;
  attachments?: string[];
};

export type RateTicketPayload = {
  rating: number;
  feedback?: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer?: string;
  answerPreview?: string;
  category?: string;
  relatedIds?: string[];
  sortOrder?: number;
};

export type CallbackRequestPayload = {
  phone?: string;
  orderId?: string;
  reason?: string;
  window?: '10_12' | '12_14' | '14_18' | '18_21';
};

export type TicketListResult = {
  tickets: SupportTicket[];
  meta?: PaginationMeta;
};
