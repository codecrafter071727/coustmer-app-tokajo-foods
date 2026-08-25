import axios from 'axios';

import { api } from '@/lib/api';
import type {
  PaginationMeta,
  ReportReviewPayload,
  RatingDistribution,
  RestaurantReview,
  ReviewListResult,
  ReviewOwnerReply,
  ReviewStats,
  SubmitDishReviewsPayload,
  SubmitOrderReviewPayload,
  SubmitReviewPayload,
} from '@/lib/review/types';

const REVIEW_SERVICE = '/api/v1/review-service';

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
      timeout: 12_000,
      headers: isMutating
        ? {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }
        : { Accept: 'application/json' },
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status >= 400) {
      const data = response.data as
        | { message?: string; error?: string; success?: boolean }
        | undefined;
      const err = new Error(
        data?.message || data?.error || `Request failed (${response.status})`
      ) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    const payload = response.data as Envelope<T> | T;
    if (
      payload &&
      typeof payload === 'object' &&
      ('data' in (payload as object) || 'success' in (payload as object))
    ) {
      const envelope = payload as Envelope<T>;
      if (envelope.success === false) {
        const err = new Error(
          envelope.message || 'Review service unavailable'
        ) as Error & { status?: number };
        err.status = 502;
        throw err;
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
        data?.message ||
        data?.error ||
        `Request failed (${error.response.status})`;

      if (message.toLowerCase().includes('csrf')) {
        throw new Error(
          'Security token expired. Close and reopen the app, then try again.'
        );
      }

      const err = new Error(message) as Error & { status?: number };
      err.status = error.response.status;
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
    record.reviews ??
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

function extractMeta(
  data: unknown,
  envelopeMeta?: PaginationMeta
): PaginationMeta | undefined {
  if (envelopeMeta) return envelopeMeta;
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  if (record.meta && typeof record.meta === 'object') {
    return record.meta as PaginationMeta;
  }
  const total = typeof record.total === 'number' ? record.total : undefined;
  const page = typeof record.page === 'number' ? record.page : undefined;
  const limit = typeof record.limit === 'number' ? record.limit : undefined;
  const totalPages =
    typeof record.totalPages === 'number' ? record.totalPages : undefined;
  const hasNext =
    typeof record.hasNext === 'boolean' ? record.hasNext : undefined;
  if (
    total === undefined &&
    page === undefined &&
    limit === undefined &&
    totalPages === undefined
  ) {
    return undefined;
  }
  return { total, page, limit, totalPages, hasNext };
}

function clampRating(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, Math.round(n)));
}

/** Ensure a 1–5 int for review-service Zod (coerce of undefined → NaN). */
function requireStarRating(value: unknown, label = 'rating'): number {
  const n = clampRating(value);
  if (n < 1 || n > 5) {
    throw new Error(`Please select a ${label} from 1 to 5 stars.`);
  }
  return n;
}

function mapDishRatings(
  dishes: Array<{ itemId: string; rating: number }> | undefined
): Array<{ itemId: string; rating: number }> | undefined {
  if (!dishes?.length) return undefined;
  return dishes
    .map((d) => ({
      itemId: String(d.itemId ?? '').trim(),
      rating: requireStarRating(d.rating, 'dish rating'),
    }))
    .filter((d) => d.itemId.length > 0);
}

function mapReply(raw: Record<string, unknown>): ReviewOwnerReply | undefined {
  const replyObj =
    raw.reply && typeof raw.reply === 'object'
      ? (raw.reply as Record<string, unknown>)
      : undefined;

  const text = String(
    replyObj?.text ??
      replyObj?.comment ??
      replyObj?.message ??
      raw.ownerReply ??
      raw.restaurantReply ??
      raw.replyText ??
      (typeof raw.reply === 'string' ? raw.reply : '') ??
      ''
  ).trim();

  if (!text) return undefined;

  return {
    text,
    repliedAt:
      (replyObj?.repliedAt as string) ||
      (replyObj?.createdAt as string) ||
      (raw.repliedAt as string) ||
      undefined,
    repliedBy:
      (replyObj?.repliedBy as string) ||
      (replyObj?.author as string) ||
      (raw.repliedBy as string) ||
      'Restaurant',
  };
}

export function mapReview(raw: Record<string, unknown>): RestaurantReview {
  const user =
    raw.user && typeof raw.user === 'object'
      ? (raw.user as Record<string, unknown>)
      : undefined;

  return {
    id: String(raw._id ?? raw.id ?? ''),
    restaurantId: raw.restaurantId
      ? String(raw.restaurantId)
      : raw.restaurant
        ? String(raw.restaurant)
        : undefined,
    orderId: raw.orderId
      ? String(raw.orderId)
      : raw.order
        ? String(raw.order)
        : undefined,
    userId: raw.userId
      ? String(raw.userId)
      : user?.id
        ? String(user.id)
        : user?._id
          ? String(user._id)
          : undefined,
    userName:
      (raw.userName as string) ||
      (raw.customerName as string) ||
      (user?.name as string) ||
      ([user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
        undefined) ||
      (raw.name as string) ||
      undefined,
    rating: clampRating(raw.rating ?? raw.stars ?? raw.score),
    comment:
      (raw.comment as string) ||
      (raw.review as string) ||
      (raw.text as string) ||
      (raw.body as string) ||
      undefined,
    title: (raw.title as string) || undefined,
    photos: Array.isArray(raw.photos)
      ? raw.photos.map((p) => String(p)).filter(Boolean)
      : Array.isArray(raw.images)
        ? raw.images.map((p) => String(p)).filter(Boolean)
        : undefined,
    reply: mapReply(raw),
    createdAt:
      (raw.createdAt as string) ||
      (raw.created_at as string) ||
      undefined,
    updatedAt:
      (raw.updatedAt as string) ||
      (raw.updated_at as string) ||
      undefined,
  };
}

function emptyDistribution(): RatingDistribution {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function mapStats(data: unknown): ReviewStats {
  const record = asRecord(data);
  const distRaw = asRecord(
    record.distribution ??
      record.ratingDistribution ??
      record.breakdown ??
      record.ratingBreakdown ??
      {}
  );

  const distribution = emptyDistribution();
  ([1, 2, 3, 4, 5] as const).forEach((star) => {
    const value =
      distRaw[String(star)] ??
      distRaw[`${star}star`] ??
      distRaw[`${star}Star`] ??
      distRaw[`star${star}`];
    distribution[star] = Number(value) || 0;
  });

  // Some APIs nest counts as array [{star:5,count:10}, ...]
  if (
    Array.isArray(record.distribution) ||
    Array.isArray(record.ratingDistribution)
  ) {
    const arr = (record.distribution ??
      record.ratingDistribution) as unknown[];
    for (const row of arr) {
      const item = asRecord(row);
      const star = clampRating(item.star ?? item.rating ?? item.stars);
      const count = Number(item.count ?? item.total ?? 0) || 0;
      if (star >= 1 && star <= 5) {
        distribution[star as 1 | 2 | 3 | 4 | 5] = count;
      }
    }
  }

  return {
    average: clampRating(
      record.average ??
        record.avgRating ??
        record.averageRating ??
        record.rating ??
        0
    ),
    total:
      Number(
        record.total ??
          record.totalReviews ??
          record.count ??
          record.reviewCount ??
          0
      ) || 0,
    distribution,
  };
}

function isNotFoundError(error: unknown): boolean {
  const status = (error as Error & { status?: number }).status;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    status === 404 ||
    status === 204 ||
    message.includes('not found') ||
    message.includes('no review') ||
    message.includes('not reviewed') ||
    message.includes('has not reviewed')
  );
}

function isServiceUnavailable(error: unknown): boolean {
  const status = (error as Error & { status?: number }).status;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes('unable to reach') ||
    message.includes('unavailable') ||
    message.includes('try again later')
  );
}

export const reviewApi = {
  /** GET /health */
  health: async (): Promise<boolean> => {
    try {
      const res = await request<unknown>(`${REVIEW_SERVICE}/health`);
      return res.success !== false;
    } catch {
      return false;
    }
  },

  /** GET /health/ready */
  ready: async (): Promise<boolean> => {
    try {
      const res = await request<unknown>(`${REVIEW_SERVICE}/health/ready`);
      return res.success !== false;
    } catch {
      return false;
    }
  },

  /** GET /restaurants/:restaurantId/reviews */
  getRestaurantReviews: async (
    restaurantId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ReviewListResult> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit ?? 20));
    const qs = query.toString();

    try {
      const res = await request<unknown>(
        `${REVIEW_SERVICE}/restaurants/${restaurantId}/reviews${qs ? `?${qs}` : ''}`
      );

      const reviews = extractList(res.data)
        .map(mapReview)
        .filter((r) => r.id && r.rating > 0)
        .sort((a, b) => {
          const at = a.createdAt ? Date.parse(a.createdAt) : 0;
          const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
          return bt - at;
        });

      return {
        reviews,
        meta: extractMeta(res.data, res.meta) ?? {
          total: reviews.length,
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
        },
      };
    } catch (error) {
      if (isServiceUnavailable(error) || isNotFoundError(error)) {
        return { reviews: [], meta: { total: 0, page: 1, limit: params?.limit ?? 20 } };
      }
      throw error;
    }
  },

  /** GET /restaurants/:restaurantId/reviews/stats */
  getRestaurantReviewStats: async (
    restaurantId: string
  ): Promise<ReviewStats> => {
    try {
      const res = await request<unknown>(
        `${REVIEW_SERVICE}/restaurants/${restaurantId}/reviews/stats`
      );
      return mapStats(res.data);
    } catch (error) {
      if (isServiceUnavailable(error) || isNotFoundError(error)) {
        return { average: 0, total: 0, distribution: emptyDistribution() };
      }
      throw error;
    }
  },

  /** POST /restaurants/:restaurantId/reviews (auth) */
  submitRestaurantReview: async (
    restaurantId: string,
    payload: SubmitReviewPayload
  ): Promise<RestaurantReview> => {
    if (!restaurantId) {
      throw new Error('Restaurant is missing for this order.');
    }
    const rating = clampRating(payload.rating);
    if (rating < 1) {
      throw new Error('Please select a rating from 1 to 5 stars.');
    }

    const body = {
      rating,
      comment: payload.comment?.trim() || undefined,
      review: payload.comment?.trim() || undefined,
      title: payload.title?.trim() || undefined,
      orderId: payload.orderId || undefined,
      photos: payload.photos?.filter(Boolean),
      images: payload.photos?.filter(Boolean),
    };

    const res = await request<Record<string, unknown>>(
      `${REVIEW_SERVICE}/restaurants/${restaurantId}/reviews`,
      { method: 'POST', body }
    );

    return mapReview(asRecord(res.data ?? {}));
  },

  /** PUT /restaurants/:restaurantId/reviews/:reviewId (auth) */
  updateRestaurantReview: async (
    restaurantId: string,
    reviewId: string,
    payload: SubmitReviewPayload
  ): Promise<RestaurantReview> => {
    if (!restaurantId) throw new Error('Restaurant is missing for this review.');
    if (!reviewId) throw new Error('Review ID is missing.');
    const rating = clampRating(payload.rating);
    if (rating < 1) throw new Error('Please select a rating from 1 to 5 stars.');

    const body = {
      rating,
      comment: payload.comment?.trim() || undefined,
      review: payload.comment?.trim() || undefined,
      title: payload.title?.trim() || undefined,
      orderId: payload.orderId || undefined,
      photos: payload.photos?.filter(Boolean),
      images: payload.photos?.filter(Boolean),
    };

    const res = await request<Record<string, unknown>>(
      `${REVIEW_SERVICE}/restaurants/${restaurantId}/reviews/${reviewId}`,
      { method: 'PUT', body }
    );
    return mapReview(asRecord(res.data ?? {}));
  },

  /** DELETE /restaurants/:restaurantId/reviews/:reviewId (auth) */
  deleteRestaurantReview: async (
    restaurantId: string,
    reviewId: string
  ): Promise<void> => {
    if (!restaurantId) throw new Error('Restaurant is missing for this review.');
    if (!reviewId) throw new Error('Review ID is missing.');
    await request<unknown>(
      `${REVIEW_SERVICE}/restaurants/${restaurantId}/reviews/${reviewId}`,
      { method: 'DELETE' }
    );
  },

  /** POST /restaurants/:restaurantId/reviews/:reviewId/report */
  reportRestaurantReview: async (
    restaurantId: string,
    reviewId: string,
    payload: ReportReviewPayload
  ): Promise<void> => {
    if (!restaurantId) throw new Error('Restaurant is missing for this review.');
    if (!reviewId) throw new Error('Review ID is missing.');
    if (!payload.reason?.trim()) throw new Error('Please select a reason to report.');
    await request<unknown>(
      `${REVIEW_SERVICE}/restaurants/${restaurantId}/reviews/${reviewId}/report`,
      { method: 'POST', body: { reason: payload.reason.trim() } }
    );
  },

  /**
   * GET /orders/:orderId/review (auth)
   * Returns null when not reviewed yet, or when review-service is briefly down
   * so Rate CTA still shows (Swiggy-style).
   */
  getOrderReview: async (
    orderId: string
  ): Promise<RestaurantReview | null> => {
    try {
      const res = await request<Record<string, unknown> | null>(
        `${REVIEW_SERVICE}/orders/${orderId}/review`
      );
      if (!res.data) return null;
      const mapped = mapReview(asRecord(res.data));
      return mapped.id || mapped.rating ? mapped : null;
    } catch (error) {
      if (isNotFoundError(error) || isServiceUnavailable(error)) {
        return null;
      }
      throw error;
    }
  },

  /** POST /orders/:orderId/reviews — combined restaurant + packaging + photos */
  submitOrderReview: async (
    orderId: string,
    payload: SubmitOrderReviewPayload
  ): Promise<RestaurantReview> => {
    if (!orderId) throw new Error('Order ID is missing.');
    const restaurantRating = requireStarRating(payload.rating, 'food rating');
    const packagingRaw =
      payload.packagingRating === undefined || payload.packagingRating === null
        ? undefined
        : requireStarRating(payload.packagingRating, 'packaging rating');
    const imageUrls = (payload.photos ?? []).filter(Boolean);
    const dishes = mapDishRatings(payload.dishes);

    const body: Record<string, unknown> = {
      restaurantRating,
      comment: payload.comment?.trim() || undefined,
      customerName: undefined,
      imageUrls: imageUrls.length ? imageUrls : undefined,
    };
    if (packagingRaw !== undefined) body.packagingRating = packagingRaw;
    if (dishes?.length) body.dishes = dishes;

    const res = await request<Record<string, unknown>>(
      `${REVIEW_SERVICE}/orders/${orderId}/reviews`,
      { method: 'POST', body }
    );
    const data = asRecord(res.data ?? {});
    const reviewRaw =
      data.review && typeof data.review === 'object'
        ? asRecord(data.review)
        : data;
    return mapReview(reviewRaw);
  },

  /** POST /orders/:orderId/reviews/dishes — per-item ratings (1–5) */
  submitDishReviews: async (
    orderId: string,
    payload: SubmitDishReviewsPayload
  ): Promise<void> => {
    if (!orderId) throw new Error('Order ID is missing.');
    const dishes = mapDishRatings(payload.dishes);
    if (!dishes?.length) throw new Error('Add at least one dish rating.');
    await request<unknown>(`${REVIEW_SERVICE}/orders/${orderId}/reviews/dishes`, {
      method: 'POST',
      body: { dishes },
    });
  },
};
