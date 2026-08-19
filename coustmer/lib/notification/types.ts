/**
 * Notification Service API types.
 * Gateway: /api/v1/notification-service
 * Routes: /notifications (+ /health)
 */

export type PaginationMeta = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNext?: boolean;
};

export type NotificationType =
  | 'order'
  | 'promo'
  | 'payment'
  | 'system'
  | 'delivery'
  | string;

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  createdAt?: string;
  /** Deep-link target when present (order id, restaurant id, etc.) */
  data?: Record<string, unknown>;
  imageUrl?: string;
};

export type NotificationListResult = {
  notifications: AppNotification[];
  meta?: PaginationMeta;
};

export type UnreadCountResult = {
  count: number;
};

export type NotificationDevice = {
  id: string;
  token?: string;
  platform?: string;
  app?: string;
  createdAt?: string;
};

export type NotificationPreferences = {
  orders: boolean;
  offers: boolean;
  whatsapp: boolean;
};
