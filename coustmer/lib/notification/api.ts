import axios from 'axios';

import { api } from '@/lib/api';
import type {
  AppNotification,
  NotificationListResult,
  PaginationMeta,
  UnreadCountResult,
} from '@/lib/notification/types';

const NOTIFICATION_SERVICE = '/api/v1/notification-service';
const NOTIFICATIONS_BASE = `${NOTIFICATION_SERVICE}/notifications`;

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
};

async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
  } = {}
): Promise<Envelope<T>> {
  const { method = 'GET', body } = options;
  const isMutating = method !== 'GET';

  try {
    const response = await api.request<Envelope<T> | T>({
      url: path,
      method,
      data: isMutating ? (body ?? {}) : body,
      withCredentials: true,
      headers: isMutating
        ? {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }
        : { Accept: 'application/json' },
    });

    const payload = response.data as Envelope<T> | T;
    if (
      payload &&
      typeof payload === 'object' &&
      ('data' in (payload as object) || 'success' in (payload as object))
    ) {
      const envelope = payload as Envelope<T>;
      if (envelope.success === false) {
        throw new Error(envelope.message || 'Notification service unavailable');
      }
      return envelope;
    }

    return { success: true, data: payload as T };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new Error(
          'Network request failed. Check your internet connection and try again.'
        );
      }

      const data = error.response.data as
        | { message?: string; error?: string }
        | undefined;
      const message =
        data?.message || data?.error || `Request failed (${error.response.status})`;

      if (message.toLowerCase().includes('csrf')) {
        throw new Error(
          'Security token expired. Close and reopen the app, then try again.'
        );
      }

      throw new Error(message);
    }

    throw error;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function extractList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  const nested =
    record.notifications ??
    record.items ??
    record.results ??
    record.docs ??
    record.list ??
    record.data ??
    [];
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  if (nested && typeof nested === 'object') return extractList(nested);
  return [];
}

function mapNotification(raw: Record<string, unknown>): AppNotification {
  const nestedData =
    raw.data && typeof raw.data === 'object'
      ? (raw.data as Record<string, unknown>)
      : undefined;

  const isReadRaw = raw.isRead ?? raw.read ?? raw.is_read ?? raw.seen;
  const isRead =
    typeof isReadRaw === 'boolean'
      ? isReadRaw
      : String(isReadRaw ?? '').toLowerCase() === 'true' ||
        String(raw.status ?? '').toLowerCase() === 'read';

  return {
    id: String(raw._id ?? raw.id ?? ''),
    title: String(raw.title ?? raw.subject ?? 'Notification'),
    body: String(
      raw.body ?? raw.message ?? raw.content ?? raw.description ?? ''
    ),
    type: String(raw.type ?? raw.category ?? 'system'),
    isRead,
    createdAt:
      (raw.createdAt as string) ||
      (raw.created_at as string) ||
      (raw.timestamp as string) ||
      undefined,
    data: nestedData ?? (raw.payload as Record<string, unknown> | undefined),
    imageUrl:
      (raw.imageUrl as string) ||
      (raw.image as string) ||
      (raw.iconUrl as string) ||
      undefined,
  };
}

function mapUnreadCount(data: unknown): number {
  if (typeof data === 'number') return data;
  const record = asRecord(data);
  const count =
    record.count ??
    record.unreadCount ??
    record.unread ??
    record.totalUnread ??
    record.total;
  return typeof count === 'number' ? count : Number(count) || 0;
}

export const notificationApi = {
  /** GET /health */
  health: async (): Promise<boolean> => {
    try {
      const res = await request<unknown>(`${NOTIFICATION_SERVICE}/health`);
      return res.success !== false;
    } catch {
      return false;
    }
  },

  /** GET /notifications?page=&limit=&unread=true */
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unread?: boolean;
  }): Promise<NotificationListResult> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.unread) query.set('unread', 'true');

    const qs = query.toString();
    const res = await request<unknown>(
      `${NOTIFICATIONS_BASE}${qs ? `?${qs}` : ''}`
    );

    return {
      notifications: extractList(res.data).map(mapNotification).filter((n) => n.id),
      meta:
        res.meta ||
        (res.data && typeof res.data === 'object'
          ? ((res.data as Record<string, unknown>).meta as PaginationMeta | undefined)
          : undefined),
    };
  },

  /** GET /notifications/unread-count */
  getUnreadCount: async (): Promise<UnreadCountResult> => {
    const res = await request<unknown>(`${NOTIFICATIONS_BASE}/unread-count`);
    return { count: mapUnreadCount(res.data) };
  },

  /** PUT /notifications/read-all */
  markAllRead: async (): Promise<void> => {
    await request(`${NOTIFICATIONS_BASE}/read-all`, { method: 'PUT' });
  },

  /** DELETE /notifications/clear-all */
  clearAll: async (): Promise<void> => {
    await request(`${NOTIFICATIONS_BASE}/clear-all`, { method: 'DELETE' });
  },

  /** PUT /notifications/:id/read */
  markRead: async (id: string): Promise<AppNotification | null> => {
    const res = await request<Record<string, unknown>>(
      `${NOTIFICATIONS_BASE}/${id}/read`,
      { method: 'PUT' }
    );
    if (!res.data || typeof res.data !== 'object') return null;
    return mapNotification(asRecord(res.data));
  },

  /** DELETE /notifications/:id */
  deleteNotification: async (id: string): Promise<void> => {
    await request(`${NOTIFICATIONS_BASE}/${id}`, { method: 'DELETE' });
  },
};
