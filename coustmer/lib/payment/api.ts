import axios from 'axios';

import { api } from '@/lib/api';
import type {
  InitiatePaymentPayload,
  PaginationMeta,
  Payment,
  PaymentListResult,
  Refund,
  RequestRefundPayload,
  SavePaymentMethodPayload,
  SavedPaymentMethod,
  VerifyPaymentPayload,
  WalletSummary,
  WalletTopupPayload,
  WalletTransaction,
  WalletTransactionsResult,
} from '@/lib/payment/types';

const PAYMENT_SERVICE = '/api/v1/payment-service';
const PAYMENTS_BASE = `${PAYMENT_SERVICE}/payments`;

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
        | { message?: string; error?: string }
        | undefined;
      const message =
        data?.message ||
        data?.error ||
        `Request failed (${error.response.status})`;

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
    record.payments ??
    record.methods ??
    record.paymentMethods ??
    record.transactions ??
    record.refunds ??
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

export function mapPayment(data: Record<string, unknown>): Payment {
  const amount = Number(
    data.amount ?? data.total ?? data.payableAmount ?? data.value ?? 0
  );

  return {
    id: String(data._id ?? data.id ?? data.paymentId ?? ''),
    orderId: String(data.orderId ?? data.order_id ?? '') || undefined,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: String(data.currency ?? 'INR'),
    status: String(data.status ?? data.paymentStatus ?? 'pending'),
    method: (data.method as string) || (data.paymentMethod as string) || undefined,
    methodId:
      String(data.methodId ?? data.paymentMethodId ?? data.savedMethodId ?? '') ||
      undefined,
    gateway: (data.gateway as string) || (data.provider as string) || undefined,
    gatewayOrderId:
      String(
        data.gatewayOrderId ??
          data.razorpayOrderId ??
          data.razorpay_order_id ??
          ''
      ) || undefined,
    gatewayPaymentId:
      String(
        data.gatewayPaymentId ??
          data.razorpayPaymentId ??
          data.razorpay_payment_id ??
          data.transactionId ??
          ''
      ) || undefined,
    paymentUrl:
      (data.paymentUrl as string) ||
      (data.checkoutUrl as string) ||
      (data.redirectUrl as string) ||
      (data.url as string) ||
      undefined,
    razorpayKey:
      (data.razorpayKey as string) ||
      (data.key as string) ||
      (data.keyId as string) ||
      undefined,
    razorpayOrderId:
      String(data.razorpayOrderId ?? data.razorpay_order_id ?? '') || undefined,
    description: (data.description as string) || (data.note as string) || undefined,
    failureReason:
      (data.failureReason as string) ||
      (data.errorMessage as string) ||
      (data.failure_reason as string) ||
      undefined,
    createdAt: (data.createdAt as string) || (data.created_at as string) || undefined,
    updatedAt: (data.updatedAt as string) || (data.updated_at as string) || undefined,
    paidAt: (data.paidAt as string) || (data.paid_at as string) || undefined,
  };
}

export function mapSavedMethod(data: Record<string, unknown>): SavedPaymentMethod {
  const type = String(data.type ?? data.methodType ?? data.method ?? 'card');
  const last4 = String(data.last4 ?? data.lastFour ?? data.cardLast4 ?? '') || undefined;
  const upiId = String(data.upiId ?? data.vpa ?? data.upi ?? '') || undefined;
  const brand = String(data.brand ?? data.network ?? data.cardBrand ?? '') || undefined;
  const label =
    String(data.label ?? data.name ?? '') ||
    (type === 'upi'
      ? upiId || 'UPI'
      : brand
        ? `${brand}${last4 ? ` ···· ${last4}` : ''}`
        : last4
          ? `Card ···· ${last4}`
          : type);

  return {
    id: String(data._id ?? data.id ?? data.methodId ?? ''),
    type,
    label,
    isDefault: Boolean(data.isDefault ?? data.default ?? data.is_default),
    last4,
    brand,
    upiId,
    expiryMonth: Number(data.expiryMonth ?? data.expMonth ?? 0) || undefined,
    expiryYear: Number(data.expiryYear ?? data.expYear ?? 0) || undefined,
    createdAt: (data.createdAt as string) || undefined,
  };
}

export function mapWallet(data: Record<string, unknown>): WalletSummary {
  return {
    balance: Number(data.balance ?? data.availableBalance ?? data.amount ?? 0),
    currency: String(data.currency ?? 'INR'),
    isLocked: Boolean(data.isLocked ?? data.locked),
    lastCredited:
      (data.lastCredited as string) || (data.lastTopupAt as string) || undefined,
  };
}

export function mapWalletTransaction(
  data: Record<string, unknown>
): WalletTransaction {
  return {
    id: String(data._id ?? data.id ?? ''),
    type: (data.type as string) || (data.txnType as string) || undefined,
    amount: Number(data.amount ?? 0),
    currency: (data.currency as string) || 'INR',
    description:
      (data.description as string) ||
      (data.note as string) ||
      (data.remarks as string) ||
      undefined,
    status: (data.status as string) || undefined,
    balanceAfter: Number(data.balanceAfter ?? data.balance ?? 0) || undefined,
    createdAt: (data.createdAt as string) || (data.created_at as string) || undefined,
  };
}

export function mapRefund(data: Record<string, unknown>): Refund {
  return {
    id: String(data._id ?? data.id ?? data.refundId ?? ''),
    orderId: String(data.orderId ?? data.order_id ?? '') || undefined,
    paymentId: String(data.paymentId ?? data.payment_id ?? '') || undefined,
    amount: Number(data.amount ?? data.refundAmount ?? 0),
    currency: (data.currency as string) || 'INR',
    reason: (data.reason as string) || (data.description as string) || undefined,
    status: String(data.status ?? 'requested'),
    createdAt: (data.createdAt as string) || undefined,
    updatedAt: (data.updatedAt as string) || undefined,
    processedAt: (data.processedAt as string) || undefined,
  };
}

export const paymentApi = {
  /** POST /payments/initiate */
  initiate: async (payload: InitiatePaymentPayload): Promise<Payment> => {
    const bodies = [
      {
        orderId: payload.orderId,
        amount: payload.amount,
        currency: payload.currency ?? 'INR',
        method: payload.method,
        paymentMethod: payload.method,
        methodId: payload.methodId,
        returnUrl: payload.returnUrl,
        description: payload.description,
      },
      {
        order_id: payload.orderId,
        amount: payload.amount,
        currency: payload.currency ?? 'INR',
        payment_method: payload.method,
        method_id: payload.methodId,
      },
    ];

    let lastError: Error | null = null;
    for (const body of bodies) {
      try {
        const res = await request<Record<string, unknown>>(
          `${PAYMENTS_BASE}/initiate`,
          { method: 'POST', body }
        );
        return mapPayment(asRecord(res.data ?? res));
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error('Failed to initiate payment');
      }
    }
    throw lastError ?? new Error('Failed to initiate payment');
  },

  /** POST /payments/verify */
  verify: async (payload: VerifyPaymentPayload): Promise<Payment> => {
    const bodies = [
      {
        paymentId: payload.paymentId,
        orderId: payload.orderId,
        gatewayPaymentId: payload.gatewayPaymentId,
        gatewayOrderId: payload.gatewayOrderId,
        gatewaySignature:
          payload.gatewaySignature ??
          payload.razorpay_signature ??
          payload.signature,
        razorpay_payment_id: payload.razorpay_payment_id ?? payload.gatewayPaymentId,
        razorpay_order_id: payload.razorpay_order_id ?? payload.gatewayOrderId,
        razorpay_signature: payload.razorpay_signature ?? payload.signature,
        signature: payload.signature ?? payload.gatewaySignature,
        status: payload.status,
        transactionId: payload.transactionId ?? payload.gatewayPaymentId,
      },
      {
        payment_id: payload.paymentId,
        order_id: payload.orderId,
        transaction_id: payload.transactionId ?? payload.gatewayPaymentId,
        gateway_payment_id: payload.gatewayPaymentId,
        gateway_order_id: payload.gatewayOrderId,
        gateway_signature:
          payload.gatewaySignature ??
          payload.razorpay_signature ??
          payload.signature,
      },
    ];

    let lastError: Error | null = null;
    for (const body of bodies) {
      try {
        const res = await request<Record<string, unknown>>(
          `${PAYMENTS_BASE}/verify`,
          { method: 'POST', body }
        );
        return mapPayment(asRecord(res.data ?? res));
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error('Failed to verify payment');
      }
    }
    throw lastError ?? new Error('Failed to verify payment');
  },

  /** GET /payments/history */
  getHistory: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaymentListResult> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const res = await request<unknown>(
      `${PAYMENTS_BASE}/history${qs ? `?${qs}` : ''}`
    );
    const list = extractList(res.data);
    return {
      payments: (list.length ? list : extractList(res)).map(mapPayment),
      meta: res.meta,
    };
  },

  /** GET /payments/:paymentId */
  getPayment: async (paymentId: string): Promise<Payment> => {
    const res = await request<Record<string, unknown>>(
      `${PAYMENTS_BASE}/${paymentId}`
    );
    return mapPayment(asRecord(res.data ?? res));
  },

  /** GET /payments/methods */
  getMethods: async (): Promise<SavedPaymentMethod[]> => {
    const res = await request<unknown>(`${PAYMENTS_BASE}/methods`);
    const list = extractList(res.data);
    return (list.length ? list : extractList(res)).map(mapSavedMethod);
  },

  /** POST /payments/methods */
  saveMethod: async (
    payload: SavePaymentMethodPayload
  ): Promise<SavedPaymentMethod> => {
    const bodies = [
      {
        type: payload.type,
        label: payload.label,
        token: payload.token,
        gatewayToken: payload.gatewayToken ?? payload.token,
        cardNumber: payload.cardNumber,
        expiryMonth: payload.expiryMonth,
        expiryYear: payload.expiryYear,
        cvv: payload.cvv,
        cardHolderName: payload.cardHolderName,
        upiId: payload.upiId,
        setAsDefault: payload.setAsDefault,
        isDefault: payload.setAsDefault,
      },
      {
        methodType: payload.type,
        gateway_token: payload.gatewayToken ?? payload.token,
        upi_id: payload.upiId,
        card_number: payload.cardNumber,
        exp_month: payload.expiryMonth,
        exp_year: payload.expiryYear,
        card_holder_name: payload.cardHolderName,
      },
    ];

    let lastError: Error | null = null;
    for (const body of bodies) {
      try {
        const res = await request<Record<string, unknown>>(
          `${PAYMENTS_BASE}/methods`,
          { method: 'POST', body }
        );
        return mapSavedMethod(asRecord(res.data ?? res));
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error('Failed to save payment method');
      }
    }
    throw lastError ?? new Error('Failed to save payment method');
  },

  /** DELETE /payments/methods/:methodId */
  deleteMethod: async (methodId: string): Promise<void> => {
    await request(`${PAYMENTS_BASE}/methods/${methodId}`, {
      method: 'DELETE',
      body: {},
    });
  },

  /** PUT /payments/methods/:methodId/default */
  setDefaultMethod: async (methodId: string): Promise<SavedPaymentMethod> => {
    const res = await request<Record<string, unknown>>(
      `${PAYMENTS_BASE}/methods/${methodId}/default`,
      { method: 'PUT', body: {} }
    );
    return mapSavedMethod(asRecord(res.data ?? res));
  },

  /** GET /payments/wallet */
  getWallet: async (): Promise<WalletSummary> => {
    const res = await request<Record<string, unknown>>(`${PAYMENTS_BASE}/wallet`);
    return mapWallet(asRecord(res.data ?? res));
  },

  /** POST /payments/wallet/topup */
  topupWallet: async (payload: WalletTopupPayload): Promise<Payment | WalletSummary> => {
    const bodies = [
      {
        amount: payload.amount,
        method: payload.method ?? 'upi',
        paymentMethod: payload.method ?? 'upi',
        methodId: payload.methodId,
        currency: payload.currency ?? 'INR',
      },
      {
        amount: payload.amount,
        payment_method: payload.method ?? 'upi',
      },
    ];

    let lastError: Error | null = null;
    for (const body of bodies) {
      try {
        const res = await request<Record<string, unknown>>(
          `${PAYMENTS_BASE}/wallet/topup`,
          { method: 'POST', body }
        );
        const data = asRecord(res.data ?? res);
        // Topup may return a Payment (to complete) or updated wallet
        if (
          data.balance !== undefined ||
          data.availableBalance !== undefined
        ) {
          return mapWallet(data);
        }
        return mapPayment(data);
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error('Failed to top up wallet');
      }
    }
    throw lastError ?? new Error('Failed to top up wallet');
  },

  /** GET /payments/wallet/transactions */
  getWalletTransactions: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<WalletTransactionsResult> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const res = await request<unknown>(
      `${PAYMENTS_BASE}/wallet/transactions${qs ? `?${qs}` : ''}`
    );
    const list = extractList(res.data);
    return {
      transactions: (list.length ? list : extractList(res)).map(
        mapWalletTransaction
      ),
      meta: res.meta,
    };
  },

  /** POST /payments/refunds/request */
  requestRefund: async (payload: RequestRefundPayload): Promise<Refund> => {
    const bodies = [
      {
        orderId: payload.orderId,
        paymentId: payload.paymentId,
        amount: payload.amount,
        reason: payload.reason,
        type: payload.type,
      },
      {
        order_id: payload.orderId,
        payment_id: payload.paymentId,
        amount: payload.amount,
        reason: payload.reason,
      },
    ];

    let lastError: Error | null = null;
    for (const body of bodies) {
      try {
        const res = await request<Record<string, unknown>>(
          `${PAYMENTS_BASE}/refunds/request`,
          { method: 'POST', body }
        );
        return mapRefund(asRecord(res.data ?? res));
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error('Failed to request refund');
      }
    }
    throw lastError ?? new Error('Failed to request refund');
  },

  /** GET /payments/refunds/:refundId */
  getRefund: async (refundId: string): Promise<Refund> => {
    const res = await request<Record<string, unknown>>(
      `${PAYMENTS_BASE}/refunds/${refundId}`
    );
    return mapRefund(asRecord(res.data ?? res));
  },

  /** GET /payments/:orderId/refunds */
  getOrderRefunds: async (orderId: string): Promise<Refund[]> => {
    const res = await request<unknown>(`${PAYMENTS_BASE}/${orderId}/refunds`);
    const list = extractList(res.data);
    return (list.length ? list : extractList(res)).map(mapRefund);
  },
};
