import axios from 'axios';

import { api } from '@/lib/api';
import type {
  CancelOrderPayload,
  CancellationQuote,
  CreateOrderPayload,
  Order,
  OrderInvoice,
  OrderIssue,
  OrderListResult,
  OrderTimelineEvent,
  OrderTracking,
  PaginationMeta,
  PartialCancelPayload,
  ReportIssuePayload,
  TipPayload,
} from '@/lib/order/types';
import { createIdempotencyKey } from '@/lib/order/idempotency';
import { toTenDigitIndianMobile } from '@/lib/order/phone';
import { geoPointFromPin, parseDropPin } from '@/lib/location/drop-pin';

const ORDER_SERVICE = '/api/v1/order-service';
const ORDERS_BASE = `${ORDER_SERVICE}/orders`;

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
    headers?: Record<string, string>;
    responseType?: 'json' | 'blob' | 'arraybuffer';
  } = {}
): Promise<Envelope<T>> {
  const { method = 'GET', body, headers, responseType } = options;
  const isMutating = method !== 'GET';

  try {
    const response = await api.request<Envelope<T> | T>({
      url: path,
      method,
      // Empty POST/PUT/DELETE without a JSON body can become 415 Unsupported Media Type
      data: isMutating ? (body ?? {}) : body,
      withCredentials: true,
      responseType: responseType === 'json' || !responseType ? 'json' : responseType,
      headers: {
        Accept: 'application/json',
        ...(isMutating ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    });

    const payload = response.data as Envelope<T> | T;
    if (
      payload &&
      typeof payload === 'object' &&
      ('data' in (payload as object) || 'success' in (payload as object))
    ) {
      return payload as Envelope<T>;
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
        | {
            message?: string | string[];
            error?: string;
            code?: string;
            errors?: Record<string, string[] | string> | string[];
          }
        | undefined;

      let message =
        (Array.isArray(data?.message)
          ? data?.message.join('; ')
          : data?.message) ||
        data?.error ||
        `Request failed (${error.response.status})`;

      if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
        const parts = Object.entries(data.errors).map(([key, val]) => {
          const text = Array.isArray(val) ? val.join(', ') : String(val);
          return `${key}: ${text}`;
        });
        if (parts.length) message = parts.join('; ');
      } else if (Array.isArray(data?.errors)) {
        message = data.errors.join('; ');
      }

      if (message.toLowerCase().includes('csrf')) {
        throw new Error(
          'Security token expired. Close and reopen the app, then try again.'
        );
      }

      const err = new Error(message) as Error & {
        status?: number;
        code?: string;
      };
      err.status = error.response.status;
      err.code = data?.code;
      throw err;
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
    record.orders ??
    record.activeOrders ??
    record.scheduledOrders ??
    record.active ??
    record.scheduled ??
    record.items ??
    record.results ??
    record.docs ??
    record.list ??
    record.data ??
    [];
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  // Nested envelope: { data: { orders: [...] } }
  if (nested && typeof nested === 'object') {
    return extractList(nested);
  }
  return [];
}

function mapOrderItem(raw: Record<string, unknown>) {
  return {
    id: String(raw._id ?? raw.id ?? raw.menuItemId ?? ''),
    menuItemId: String(raw.menuItemId ?? raw.itemId ?? raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? raw.itemName ?? raw.title ?? 'Item'),
    price: Number(raw.price ?? raw.unitPrice ?? raw.basePrice ?? 0),
    quantity: Number(raw.quantity ?? raw.qty ?? 1),
    isVeg: raw.isVeg !== undefined ? Boolean(raw.isVeg) : undefined,
    imageUrl: (raw.imageUrl as string) || (raw.image as string) || undefined,
    specialInstructions:
      (raw.specialInstructions as string) || (raw.notes as string) || undefined,
  };
}

function mapAddress(raw: unknown) {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    return { formattedAddress: raw };
  }
  const a = asRecord(raw);
  return {
    label: (a.label as string) || undefined,
    formattedAddress:
      (a.formattedAddress as string) ||
      (a.fullAddress as string) ||
      (a.address as string) ||
      undefined,
    street: (a.street as string) || undefined,
    area: (a.area as string) || undefined,
    city: (a.city as string) || undefined,
    state: (a.state as string) || undefined,
    pincode: String(a.pincode ?? a.pinCode ?? a.zip ?? '') || undefined,
    lat:
      typeof a.lat === 'number'
        ? a.lat
        : Number((a.location as { coordinates?: number[] })?.coordinates?.[1]) ||
          undefined,
    lng:
      typeof a.lng === 'number'
        ? a.lng
        : Number((a.location as { coordinates?: number[] })?.coordinates?.[0]) ||
          undefined,
  };
}

export function mapOrder(data: Record<string, unknown>): Order {
  const itemsRaw = data.items ?? data.orderItems ?? data.cartItems ?? [];
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => mapOrderItem(asRecord(row)))
    : [];

  const restaurant =
    data.restaurant && typeof data.restaurant === 'object'
      ? asRecord(data.restaurant)
      : undefined;

  const pricing =
    data.pricing && typeof data.pricing === 'object'
      ? asRecord(data.pricing)
      : data.bill && typeof data.bill === 'object'
        ? asRecord(data.bill)
        : undefined;

  const pickNum = (...vals: unknown[]) => {
    for (const v of vals) {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };

  const subtotal =
    pickNum(
      data.subtotal,
      data.itemTotal,
      data.itemsTotal,
      pricing?.subtotal,
      pricing?.itemTotal
    ) ??
    items.reduce((s, i) => s + i.price * i.quantity, 0);

  const deliveryFee =
    pickNum(
      data.deliveryFee,
      data.deliveryCharge,
      data.shippingFee,
      pricing?.deliveryFee,
      pricing?.deliveryCharge
    ) ?? 0;

  const discount =
    pickNum(
      data.discount,
      data.discountAmount,
      data.couponDiscount,
      data.promoDiscount,
      pricing?.discount,
      pricing?.couponDiscount
    ) ?? 0;

  const tip =
    pickNum(
      data.tip,
      data.deliveryTip,
      data.tipAmount,
      pricing?.tip,
      pricing?.deliveryTip
    ) ?? 0;

  let tax =
    pickNum(
      data.tax,
      data.taxes,
      data.taxAmount,
      data.gst,
      data.gstAmount,
      data.taxesAndCharges,
      data.taxAndCharges,
      pricing?.tax,
      pricing?.taxes,
      pricing?.gst,
      pricing?.gstAmount,
      pricing?.taxesAndCharges
    ) ?? 0;

  const chargesRaw = data.charges ?? pricing?.charges;
  if (Array.isArray(chargesRaw) && tax <= 0) {
    tax = chargesRaw.reduce((sum, row) => {
      const c = asRecord(row);
      const label = String(c.name ?? c.type ?? c.label ?? '').toLowerCase();
      const amount = pickNum(c.amount, c.value, c.price) ?? 0;
      if (
        label.includes('tax') ||
        label.includes('gst') ||
        label.includes('vat')
      ) {
        return sum + amount;
      }
      return sum;
    }, 0);
  }

  let total =
    pickNum(
      data.total,
      data.grandTotal,
      data.totalAmount,
      data.amount,
      data.payableAmount,
      data.toPay,
      pricing?.total,
      pricing?.grandTotal,
      pricing?.payableAmount
    ) ?? subtotal + deliveryFee + tax + tip - discount;

  // Derive tax from grand total when API omits an explicit tax line
  if (tax <= 0 && Number.isFinite(total) && total > 0) {
    const withoutTax = subtotal + deliveryFee + tip - discount;
    const implied = Math.round((total - withoutTax) * 100) / 100;
    if (implied > 0.009) tax = implied;
  }

  // Tokajo default: 5% tax on item total when still missing
  if (tax <= 0 && subtotal > 0) {
    tax = Math.round(subtotal * 0.05 * 100) / 100;
    const withoutTax = subtotal + deliveryFee + tip - discount;
    if (Math.abs(total - withoutTax) < 0.02) {
      total = Math.round((withoutTax + tax) * 100) / 100;
    }
  }

  return {
    id: String(data._id ?? data.id ?? ''),
    orderNumber: String(
      data.orderNumber ?? data.orderNo ?? data.number ?? data.code ?? ''
    ) || undefined,
    restaurantId: String(
      data.restaurantId ?? restaurant?._id ?? restaurant?.id ?? ''
    ) || undefined,
    restaurantName: String(
      data.restaurantName ?? restaurant?.name ?? data.outletName ?? ''
    ) || undefined,
    status: String(data.status ?? data.orderStatus ?? 'pending'),
    items,
    subtotal: Number.isFinite(subtotal) ? subtotal : undefined,
    deliveryFee: Number.isFinite(deliveryFee) ? deliveryFee : undefined,
    tax: Number.isFinite(tax) ? tax : undefined,
    discount: Number.isFinite(discount) ? discount : undefined,
    tip: Number.isFinite(tip) ? tip : undefined,
    couponCode:
      (data.couponCode as string) ||
      (data.promoCode as string) ||
      (data.voucherCode as string) ||
      ((data.coupon as { code?: string } | undefined)?.code) ||
      ((data.promo as { code?: string } | undefined)?.code) ||
      undefined,
    total: Number.isFinite(total) ? total : undefined,
    paymentMethod: (data.paymentMethod as string) || (data.paymentMode as string) || undefined,
    paymentStatus: (data.paymentStatus as string) || undefined,
    deliveryAddress: mapAddress(
      data.deliveryAddress ?? data.address ?? data.shippingAddress
    ),
    specialInstructions:
      (data.specialInstructions as string) ||
      (data.notes as string) ||
      (data.instructions as string) ||
      undefined,
    scheduledFor:
      (data.scheduledFor as string) ||
      (data.scheduledAt as string) ||
      (data.scheduledTime as string) ||
      undefined,
    isScheduled: Boolean(
      data.isScheduled ?? data.scheduledFor ?? data.scheduledAt
    ),
    estimatedDeliveryAt:
      (data.estimatedDeliveryAt as string) ||
      (data.eta as string) ||
      (data.estimatedDeliveryTime as string) ||
      undefined,
    createdAt: (data.createdAt as string) || undefined,
    updatedAt: (data.updatedAt as string) || undefined,
    cancelledAt: (data.cancelledAt as string) || undefined,
    cancelReason:
      (data.cancelReason as string) || (data.cancellationReason as string) || undefined,
    raw: data,
  };
}

function mapIssue(data: Record<string, unknown>): OrderIssue {
  return {
    id: String(data._id ?? data.id ?? ''),
    orderId: String(data.orderId ?? '') || undefined,
    type: String(data.type ?? data.issueType ?? data.category ?? 'other'),
    description: String(
      data.description ?? data.message ?? data.details ?? data.comment ?? ''
    ),
    status: (data.status as string) || undefined,
    createdAt: (data.createdAt as string) || undefined,
    ...data,
  };
}

function mapTracking(data: Record<string, unknown>, orderId: string): OrderTracking {
  const partner =
    data.deliveryPartner && typeof data.deliveryPartner === 'object'
      ? asRecord(data.deliveryPartner)
      : asRecord(data.rider ?? data.driver);

  const partnerLoc =
    partner.location && typeof partner.location === 'object'
      ? asRecord(partner.location)
      : partner;

  const coords = (partnerLoc.coordinates as number[]) || undefined;

  return {
    orderId: String(data.orderId ?? orderId),
    status: (data.status as string) || (data.orderStatus as string) || undefined,
    etaMinutes:
      typeof data.etaMinutes === 'number'
        ? data.etaMinutes
        : Number(data.etaMins ?? data.eta) || undefined,
    etaText:
      (data.etaText as string) ||
      (data.estimatedArrival as string) ||
      (typeof data.etaMinutes === 'number'
        ? `${data.etaMinutes} mins`
        : undefined),
    deliveryPartnerName:
      (partner.name as string) ||
      (partner.fullName as string) ||
      (data.deliveryPartnerName as string) ||
      undefined,
    deliveryPartnerPhone:
      (partner.phone as string) ||
      (partner.mobile as string) ||
      (data.deliveryPartnerPhone as string) ||
      undefined,
    deliveryPartnerLat:
      typeof partnerLoc.lat === 'number'
        ? partnerLoc.lat
        : coords?.[1],
    deliveryPartnerLng:
      typeof partnerLoc.lng === 'number'
        ? partnerLoc.lng
        : coords?.[0],
    restaurantLat: Number(asRecord(data.restaurantLocation).lat) || undefined,
    restaurantLng: Number(asRecord(data.restaurantLocation).lng) || undefined,
    customerLat: Number(asRecord(data.customerLocation).lat) || undefined,
    customerLng: Number(asRecord(data.customerLocation).lng) || undefined,
    updatedAt: (data.updatedAt as string) || undefined,
    timeline: Array.isArray(data.timeline)
      ? (data.timeline as OrderTracking['timeline'])
      : Array.isArray(data.statusHistory)
        ? (data.statusHistory as OrderTracking['timeline'])
        : undefined,
    ...data,
  };
}

export const orderApi = {
  /** GET /health */
  health: async (): Promise<{ status?: string; service?: string; uptime?: number }> => {
    const res = await request<Record<string, unknown>>(`${ORDER_SERVICE}/health`);
    return (res.data ?? res) as {
      status?: string;
      service?: string;
      uptime?: number;
    };
  },

  /** POST /orders — Idempotency-Key required (8–64 chars). */
  createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
    const phone =
      toTenDigitIndianMobile(payload.deliveryAddress.contactPhone) ||
      payload.deliveryAddress.contactPhone.replace(/\D/g, '').slice(-10);

    const pin = parseDropPin(
      payload.deliveryAddress.lat,
      payload.deliveryAddress.lng
    );
    const deliveryAddress = {
      ...payload.deliveryAddress,
      contactPhone: phone,
      phone,
      mobile: phone,
      location:
        payload.deliveryAddress.location ??
        (pin ? geoPointFromPin(pin) : undefined),
    };

    const idempotencyKey = createIdempotencyKey('place');
    const headers = { 'Idempotency-Key': idempotencyKey };
    const body = {
      restaurantId: payload.restaurantId,
      restaurantName: payload.restaurantName,
      items: payload.items,
      deliveryAddress,
      paymentMethod: payload.paymentMethod,
      specialInstructions: payload.specialInstructions,
      tip: payload.tip ?? 0,
      deliveryTip: payload.tip ?? 0,
      tipAmount: payload.tip ?? 0,
      scheduledFor: payload.scheduledFor,
      deliveryType:
        payload.deliveryType === 'takeaway' ? 'pickup' : payload.deliveryType,
      fulfillmentType: payload.deliveryType,
      idempotencyKey,
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await request<Record<string, unknown>>(ORDERS_BASE, {
          method: 'POST',
          body,
          headers,
        });
        return mapOrder(asRecord(res.data ?? res));
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error('Failed to place order');
        const code = (error as Error & { code?: string }).code;
        if (code === 'IDEMPOTENCY_IN_PROGRESS') {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError ?? new Error('Failed to place order');
  },

  /** GET /orders */
  getOrders: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<OrderListResult> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const res = await request<unknown>(`${ORDERS_BASE}${qs ? `?${qs}` : ''}`);
    const list = extractList(res.data);
    return {
      orders: (list.length ? list : extractList(res)).map(mapOrder),
      meta: res.meta,
    };
  },

  /** GET /orders/active */
  getActiveOrders: async (): Promise<Order[]> => {
    const res = await request<unknown>(`${ORDERS_BASE}/active`);
    const list = extractList(res.data);
    if (list.length) return list.map(mapOrder);

    // Backend may return a single active order object in `data`
    const single = asRecord(res.data);
    if (single._id || single.id || single.orderNumber) {
      return [mapOrder(single)];
    }

    return extractList(res).map(mapOrder);
  },

  /** GET /orders/scheduled */
  getScheduledOrders: async (): Promise<Order[]> => {
    const res = await request<unknown>(`${ORDERS_BASE}/scheduled`);
    const list = extractList(res.data);
    if (list.length) return list.map(mapOrder);
    return extractList(res).map(mapOrder);
  },

  /** GET /orders/:orderId */
  getOrder: async (orderId: string): Promise<Order> => {
    const res = await request<Record<string, unknown>>(`${ORDERS_BASE}/${orderId}`);
    return mapOrder(asRecord(res.data ?? res));
  },

  /** GET /orders/:orderId/tracking */
  getTracking: async (orderId: string): Promise<OrderTracking> => {
    const res = await request<Record<string, unknown>>(
      `${ORDERS_BASE}/${orderId}/tracking`
    );
    return mapTracking(asRecord(res.data ?? res), orderId);
  },

  /** GET /orders/:orderId/invoice */
  getInvoice: async (orderId: string): Promise<OrderInvoice> => {
    try {
      const res = await request<Record<string, unknown>>(
        `${ORDERS_BASE}/${orderId}/invoice`
      );
      const data = asRecord(res.data ?? res);
      return {
        orderId,
        url:
          (data.url as string) ||
          (data.invoiceUrl as string) ||
          (data.pdfUrl as string) ||
          (data.downloadUrl as string) ||
          undefined,
        fileName: (data.fileName as string) || `invoice-${orderId}.pdf`,
        contentType: (data.contentType as string) || undefined,
        message: res.message || (data.message as string) || undefined,
        raw: data,
      };
    } catch (error) {
      // Some backends stream PDF directly — surface a clear message
      throw error instanceof Error
        ? error
        : new Error('Failed to download invoice');
    }
  },

  /** POST /orders/:orderId/cancel */
  cancelOrder: async (
    orderId: string,
    payload: CancelOrderPayload = {}
  ): Promise<Order> => {
    const res = await request<Record<string, unknown>>(
      `${ORDERS_BASE}/${orderId}/cancel`,
      { method: 'POST', body: payload }
    );
    return mapOrder(asRecord(res.data ?? res));
  },

  /** POST /orders/:orderId/reorder */
  reorder: async (
    orderId: string
  ): Promise<{ mode: 'cart' | 'order'; order?: Order; message?: string }> => {
    const res = await request<Record<string, unknown>>(
      `${ORDERS_BASE}/${orderId}/reorder`,
      { method: 'POST', body: {} }
    );
    const data = asRecord(res.data ?? res);
    // Backend often populates the cart instead of placing a new order
    if (
      data.cartId ||
      (Array.isArray(data.items) && !data._id && !data.id && !data.orderNumber)
    ) {
      return {
        mode: 'cart',
        message: res.message || 'Items added to your cart',
      };
    }
    return {
      mode: 'order',
      order: mapOrder(data),
      message: res.message,
    };
  },

  /** PUT /orders/:orderId/tip */
  updateTip: async (orderId: string, payload: TipPayload): Promise<Order> => {
    const bodies = [
      { tipAmount: payload.tip, tip: payload.tip, amount: payload.tip },
      { tipAmount: payload.tip },
      { tip: payload.tip },
      { amount: payload.tip },
    ];

    let lastError: Error | null = null;
    for (const body of bodies) {
      try {
        const res = await request<Record<string, unknown>>(
          `${ORDERS_BASE}/${orderId}/tip`,
          { method: 'PUT', body }
        );
        return mapOrder(asRecord(res.data ?? res));
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error('Failed to update tip');
      }
    }
    throw lastError ?? new Error('Failed to update tip');
  },

  /** DELETE /orders/:orderId/scheduled */
  cancelScheduledOrder: async (orderId: string): Promise<Order | void> => {
    const res = await request<Record<string, unknown>>(
      `${ORDERS_BASE}/${orderId}/scheduled`,
      { method: 'DELETE', body: {} }
    );
    if (!res.data) return;
    return mapOrder(asRecord(res.data));
  },

  /** POST /orders/:orderId/issues */
  reportIssue: async (
    orderId: string,
    payload: ReportIssuePayload
  ): Promise<OrderIssue> => {
    const id = String(orderId ?? '').trim();
    if (!id) {
      throw new Error('Missing order id. Go back and open Help from the order again.');
    }

    const type = String(payload.type ?? '').trim();
    const description = String(payload.description ?? '').trim();
    if (!type) throw new Error('Please select an issue type.');
    if (!description) throw new Error('Please describe the issue.');

    // Backend validates orderId + type in the body (not only the URL).
    const bodies: Record<string, unknown>[] = [
      {
        orderId: id,
        type,
        issueType: type,
        category: type,
        description,
        message: description,
        details: description,
        ...(payload.attachments?.length
          ? { attachments: payload.attachments }
          : {}),
      },
      {
        orderId: id,
        type,
        description,
      },
      {
        order_id: id,
        orderId: id,
        issue_type: type,
        type,
        description,
      },
    ];

    // Also try a top-level issues endpoint some backends use
    const paths = [
      `${ORDERS_BASE}/${encodeURIComponent(id)}/issues`,
      `${ORDER_SERVICE}/issues`,
      `${ORDERS_BASE}/issues`,
    ];

    let lastError: Error | null = null;
    for (const path of paths) {
      for (const body of bodies) {
        try {
          const res = await request<Record<string, unknown>>(path, {
            method: 'POST',
            body,
          });
          return mapIssue(asRecord(res.data ?? res));
        } catch (error) {
          lastError =
            error instanceof Error
              ? error
              : new Error('Failed to report issue');
          // Hard auth / not found — don't keep retrying variants forever
          const msg = lastError.message.toLowerCase();
          if (
            msg.includes('unauthorized') ||
            msg.includes('forbidden') ||
            msg.includes('401') ||
            msg.includes('403')
          ) {
            throw lastError;
          }
        }
      }
    }
    throw lastError ?? new Error('Failed to report issue');
  },

  /** GET /orders/:orderId/issues */
  getIssues: async (orderId: string): Promise<OrderIssue[]> => {
    const res = await request<unknown>(`${ORDERS_BASE}/${orderId}/issues`);
    return extractList(res.data).map(mapIssue);
  },

  /** GET /orders/:orderId/timeline */
  getTimeline: async (orderId: string): Promise<OrderTimelineEvent[]> => {
    const res = await request<unknown>(`${ORDERS_BASE}/${orderId}/timeline`);
    const payload = asRecord(res.data ?? res);
    const list: unknown[] =
      Array.isArray(res.data)
        ? res.data
        : Array.isArray(payload.timeline)
          ? payload.timeline
          : Array.isArray(payload.statusHistory)
            ? payload.statusHistory
            : Array.isArray(payload.events)
              ? payload.events
              : extractList(res.data);
    return list.map((item) => {
      const r = asRecord(item);
      return {
        status: String(r.status ?? r.state ?? r.event ?? ''),
        label: (r.label as string) || (r.title as string) || undefined,
        at: (r.at as string) || (r.timestamp as string) || (r.createdAt as string) || undefined,
        description: (r.description as string) || (r.message as string) || undefined,
      };
    });
  },

  /** GET /orders/:orderId/cancellation-quote */
  getCancellationQuote: async (orderId: string): Promise<CancellationQuote> => {
    const res = await request<unknown>(`${ORDERS_BASE}/${orderId}/cancellation-quote`);
    const d = asRecord(res.data ?? res);
    const total = Number(d.total ?? d.orderAmount ?? d.amount ?? 0);
    const refundable = Number(
      d.refundable ?? d.refundAmount ?? d.refund ?? d.refundableAmount ?? total
    );
    const nonRefundable = Number(
      d.nonRefundable ?? d.nonRefundableAmount ?? d.deduction ?? (total - refundable)
    );
    return {
      refundable: Number.isFinite(refundable) ? refundable : total,
      nonRefundable: Number.isFinite(nonRefundable) ? nonRefundable : 0,
      total: Number.isFinite(total) ? total : refundable + nonRefundable,
      reason: (d.reason as string) || (d.policy as string) || undefined,
      canCancel: d.canCancel !== false,
      message: (d.message as string) || undefined,
    };
  },

  /** PUT /orders/:orderId/items/cancel — Partial cancel pre-pickup */
  partialCancelItems: async (
    orderId: string,
    payload: PartialCancelPayload
  ): Promise<Order> => {
    const bodies = [
      {
        items: payload.items,
        reason: payload.reason,
        cancellationReason: payload.reason,
      },
      {
        cancelledItems: payload.items,
        reason: payload.reason,
      },
    ];
    let lastError: Error | null = null;
    for (const body of bodies) {
      try {
        const res = await request<Record<string, unknown>>(
          `${ORDERS_BASE}/${orderId}/items/cancel`,
          { method: 'PUT', body }
        );
        return mapOrder(asRecord(res.data ?? res));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Partial cancel failed');
        const msg = lastError.message.toLowerCase();
        if (msg.includes('unauthorized') || msg.includes('forbidden')) throw lastError;
      }
    }
    throw lastError ?? new Error('Partial cancel failed');
  },

  /** POST /orders/:orderId/help — Open support with order context */
  openHelp: async (
    orderId: string,
    payload: { type?: string; message?: string; subject?: string }
  ): Promise<{ ticketId?: string; message?: string }> => {
    const bodies = [
      {
        orderId,
        type: payload.type ?? 'general',
        message: payload.message,
        subject: payload.subject,
        context: { orderId },
      },
      {
        orderId,
        description: payload.message,
        issueType: payload.type ?? 'general',
      },
    ];
    let lastError: Error | null = null;
    for (const body of bodies) {
      try {
        const res = await request<Record<string, unknown>>(
          `${ORDERS_BASE}/${orderId}/help`,
          { method: 'POST', body }
        );
        const d = asRecord(res.data ?? res);
        return {
          ticketId: String(d.ticketId ?? d._id ?? d.id ?? '') || undefined,
          message: res.message || (d.message as string) || 'Support request submitted',
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Help request failed');
        const msg = lastError.message.toLowerCase();
        if (msg.includes('unauthorized') || msg.includes('forbidden')) throw lastError;
      }
    }
    throw lastError ?? new Error('Help request failed');
  },
};
