import axios from 'axios';

import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import type {
  AddTicketMessagePayload,
  CallbackRequestPayload,
  CreateTicketPayload,
  FaqItem,
  PaginationMeta,
  RateTicketPayload,
  SupportTicket,
  TicketListResult,
  TicketMessage,
} from '@/lib/support/types';

const CUSTOMER_BASE = '/api/v1/customer-service/customers';
const SUPPORT_BASE = `${CUSTOMER_BASE}/support`;

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
    const response = await api.request<Envelope<T>>({
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

    const payload = response.data;
    if (payload?.success === false) {
      throw new Error(payload.message || 'Support request failed');
    }
    return payload;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Support request failed. Please try again.'));
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function unwrapList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  const nested =
    record.tickets ??
    record.items ??
    record.results ??
    record.faqs ??
    record.data;
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  return [];
}

function mapMessage(m: Record<string, unknown>, index: number): TicketMessage {
  const sender = String(m.sender ?? m.senderRole ?? 'customer');
  return {
    id: String(m.messageId ?? m._id ?? m.id ?? index),
    sender,
    senderRole: sender,
    content: String(m.content ?? m.text ?? m.body ?? ''),
    attachments: Array.isArray(m.attachments)
      ? (m.attachments as string[]).map(String)
      : [],
    createdAt: String(m.sentAt ?? m.createdAt ?? '') || undefined,
    isRead: typeof m.isRead === 'boolean' ? m.isRead : undefined,
  };
}

function mapTicket(data: Record<string, unknown>): SupportTicket {
  const orderRef =
    data.orderId ??
    data.order_id ??
    (data.order && typeof data.order === 'object'
      ? (data.order as { _id?: string; id?: string })._id ??
        (data.order as { id?: string }).id
      : undefined);

  const rawMessages =
    (data.messages as Record<string, unknown>[] | undefined) ?? [];

  return {
    id: String(data.ticketId ?? data._id ?? data.id ?? ''),
    ticketNo: String(data.ticketNo ?? data.ticket_no ?? ''),
    userId: String(data.userId ?? data.customerId ?? ''),
    category: data.category as SupportTicket['category'],
    subject: String(data.subject ?? data.title ?? ''),
    description: String(data.description ?? data.message ?? data.details ?? ''),
    status: (data.status as SupportTicket['status']) ?? 'open',
    priority: String(data.priority ?? 'medium'),
    orderId: orderRef ? String(orderRef) : undefined,
    attachments: Array.isArray(data.attachments)
      ? (data.attachments as string[]).map(String)
      : [],
    messages: rawMessages.map(mapMessage),
    rating: (data.satisfactionRating ?? data.rating) as number | undefined,
    feedback: (data.satisfactionFeedback ?? data.feedback) as
      | string
      | undefined,
    resolution: data.resolution != null ? String(data.resolution) : null,
    resolutionType:
      data.resolutionType != null ? String(data.resolutionType) : null,
    refundId: data.refundId != null ? String(data.refundId) : null,
    compensationAmount:
      data.compensationAmount != null ? Number(data.compensationAmount) : null,
    resolvedAt: data.resolvedAt ? String(data.resolvedAt) : null,
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  };
}

function mapFaq(raw: Record<string, unknown>): FaqItem {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    question: String(raw.question ?? raw.title ?? raw.q ?? ''),
    answer: (raw.answer ?? raw.body ?? raw.content ?? raw.a) as
      | string
      | undefined,
    answerPreview: raw.answerPreview
      ? String(raw.answerPreview)
      : undefined,
    category: raw.category as string | undefined,
    relatedIds: Array.isArray(raw.relatedIds)
      ? (raw.relatedIds as string[]).map(String)
      : undefined,
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : undefined,
  };
}

export const supportApi = {
  /** GET /customers/support/faq */
  getFaqs: async (params?: {
    category?: string;
    q?: string;
  }): Promise<FaqItem[]> => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.q) query.set('q', params.q);
    const qs = query.toString();
    const res = await request<unknown>(
      `${SUPPORT_BASE}/faq${qs ? `?${qs}` : ''}`
    );
    return unwrapList(res.data ?? res).map(mapFaq).filter((f) => f.id);
  },

  /** GET /customers/support/faq/:faqId */
  getFaq: async (faqId: string): Promise<FaqItem> => {
    const res = await request<Record<string, unknown>>(
      `${SUPPORT_BASE}/faq/${encodeURIComponent(faqId)}`
    );
    return mapFaq(asRecord(res.data ?? res));
  },

  /** POST /customers/support/attachments/upload */
  uploadAttachment: async (localUri: string): Promise<string> => {
    const form = new FormData();
    const name = localUri.split('/').pop() ?? 'evidence.jpg';
    form.append('image', {
      uri: localUri,
      name,
      type: 'image/jpeg',
    } as unknown as Blob);

    try {
      const response = await api.post<
        Envelope<{ url?: string; imageUrl?: string }>
      >(`${SUPPORT_BASE}/attachments/upload`, form, {
        headers: { Accept: 'application/json' },
      });
      const url =
        response.data?.data?.url ?? response.data?.data?.imageUrl;
      if (!url) throw new Error('Upload did not return a URL');
      return url;
    } catch (error) {
      if (axios.isAxiosError(error) || error instanceof Error) {
        throw new Error(
          getApiErrorMessage(error, 'Failed to upload attachment.')
        );
      }
      throw error;
    }
  },

  /** POST /customers/support/tickets */
  createTicket: async (
    payload: CreateTicketPayload
  ): Promise<SupportTicket> => {
    const body = {
      category: payload.category,
      subject: payload.subject,
      description: payload.description,
      ...(payload.orderId
        ? { orderId: payload.orderId, order_id: payload.orderId }
        : {}),
      ...(payload.attachments?.length
        ? { attachments: payload.attachments }
        : {}),
    };
    const res = await request<Record<string, unknown>>(
      `${SUPPORT_BASE}/tickets`,
      { method: 'POST', body }
    );
    return mapTicket(asRecord(res.data));
  },

  /** GET /customers/support/tickets */
  getTickets: async (): Promise<TicketListResult> => {
    const res = await request<unknown>(`${SUPPORT_BASE}/tickets`);
    const tickets = unwrapList(res.data)
      .map(mapTicket)
      .filter((t) => t.id);
    return { tickets, meta: res.meta };
  },

  /** GET /customers/support/tickets/:ticketId */
  getTicket: async (ticketId: string): Promise<SupportTicket> => {
    const res = await request<Record<string, unknown>>(
      `${SUPPORT_BASE}/tickets/${encodeURIComponent(ticketId)}`
    );
    return mapTicket(asRecord(res.data));
  },

  /** POST /customers/support/tickets/:ticketId/messages */
  addMessage: async (
    ticketId: string,
    payload: AddTicketMessagePayload
  ): Promise<SupportTicket> => {
    const res = await request<Record<string, unknown>>(
      `${SUPPORT_BASE}/tickets/${encodeURIComponent(ticketId)}/messages`,
      { method: 'POST', body: payload }
    );
    return mapTicket(asRecord(res.data));
  },

  /** POST /customers/support/tickets/:ticketId/rate */
  rateTicket: async (
    ticketId: string,
    payload: RateTicketPayload
  ): Promise<SupportTicket> => {
    const res = await request<Record<string, unknown>>(
      `${SUPPORT_BASE}/tickets/${encodeURIComponent(ticketId)}/rate`,
      { method: 'POST', body: payload }
    );
    return mapTicket(asRecord(res.data));
  },

  /** POST /customers/support/tickets/:ticketId/close */
  closeTicket: async (ticketId: string): Promise<SupportTicket> => {
    const res = await request<Record<string, unknown>>(
      `${SUPPORT_BASE}/tickets/${encodeURIComponent(ticketId)}/close`,
      { method: 'POST', body: {} }
    );
    return mapTicket(asRecord(res.data));
  },

  /** POST /customers/support/tickets/:ticketId/reopen */
  reopenTicket: async (
    ticketId: string,
    reason: string
  ): Promise<SupportTicket> => {
    const res = await request<Record<string, unknown>>(
      `${SUPPORT_BASE}/tickets/${encodeURIComponent(ticketId)}/reopen`,
      { method: 'POST', body: { reason } }
    );
    return mapTicket(asRecord(res.data));
  },

  /** POST /customers/support/callback */
  requestCallback: async (payload: CallbackRequestPayload): Promise<void> => {
    await request(`${SUPPORT_BASE}/callback`, {
      method: 'POST',
      body: payload,
    });
  },
};
