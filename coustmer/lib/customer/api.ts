import axios from 'axios';

import { api } from '@/lib/api';
import { handleCustomerServiceError } from '@/lib/customer/error-handler';
import type {
  AddTicketMessagePayload,
  CreateTicketPayload,
  CustomerProfile,
  Deal,
  HomeBanner,
  HomeFeed,
  OnboardingStatus,
  PaginationMeta,
  RateTicketPayload,
  RecentActivity,
  Recommendation,
  RestaurantCard,
  SupportTicket,
} from '@/lib/customer/types';
import { mapRestaurant } from '@/lib/restaurant/mappers';
const CUSTOMER_BASE = '/api/v1/customer-service/customers';

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
    return response.data;
  } catch (error) {
    const customerError = handleCustomerServiceError(error);
    throw new Error(customerError.userMessage);
  }
}

function mapProfile(data: Record<string, unknown>): CustomerProfile {
  return {
    id: String(data._id ?? data.id ?? ''),
    userId: String(data.userId ?? ''),
    totalOrders: Number(data.totalOrders ?? 0),
    totalSpend: Number(data.totalSpend ?? 0),
    averageOrderValue: Number(data.averageOrderValue ?? 0),
    favoriteRestaurants: (data.favoriteRestaurants as string[]) ?? [],
    favoriteDishes: (data.favoriteDishes as string[]) ?? [],
    recentSearches: (data.recentSearches as string[]) ?? [],
    recentRestaurants: (data.recentRestaurants as string[]) ?? [],
    tier: String(data.tier ?? 'bronze'),
    loyaltyPoints: Number(data.loyaltyPoints ?? 0),
    onboardingCompleted: Boolean(data.onboardingCompleted ?? false),
    onboardingStep: Number(data.onboardingStep ?? 0),
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

  return {
    id: String(data._id ?? data.id ?? ''),
    userId: String(data.userId ?? data.customerId ?? ''),
    category: data.category as SupportTicket['category'],
    subject: String(data.subject ?? data.title ?? ''),
    description: String(data.description ?? data.message ?? data.details ?? ''),
    status: (data.status as SupportTicket['status']) ?? 'open',
    priority: String(data.priority ?? 'medium'),
    orderId: orderRef ? String(orderRef) : undefined,
    attachments: (data.attachments as string[]) ?? [],
    messages: (data.messages as SupportTicket['messages']) ?? [],
    rating: data.rating as number | undefined,
    feedback: data.feedback as string | undefined,
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  };
}

function unwrapList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  const nested =
    record.deals ??
    record.banners ??
    record.offers ??
    record.items ??
    record.results ??
    record.tickets ??
    record.data;
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  if (nested && typeof nested === 'object') {
    const inner = nested as Record<string, unknown>;
    const list = inner.deals ?? inner.banners ?? inner.offers ?? inner.items;
    if (Array.isArray(list)) return list as Record<string, unknown>[];
  }
  return [];
}

function mapDeal(raw: Record<string, unknown>): Deal {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    title: String(raw.title ?? raw.name ?? raw.headline ?? 'Special offer'),
    description:
      (raw.description as string | undefined) ??
      (raw.subtitle as string | undefined) ??
      (raw.details as string | undefined),
    code:
      (raw.code as string | undefined) ??
      (raw.promoCode as string | undefined) ??
      (raw.couponCode as string | undefined),
    imageUrl:
      (raw.imageUrl as string | undefined) ??
      (raw.image as string | undefined) ??
      (raw.bannerUrl as string | undefined),
    ...raw,
  };
}

function mapBanner(raw: Record<string, unknown>): HomeBanner {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    title: String(raw.title ?? raw.name ?? raw.headline ?? 'Offer'),
    imageUrl:
      (raw.imageUrl as string | undefined) ??
      (raw.image as string | undefined) ??
      (raw.bannerUrl as string | undefined),
    deepLink:
      (raw.deepLink as string | undefined) ??
      (raw.link as string | undefined) ??
      (raw.href as string | undefined),
  };
}

function mapRestaurantCard(raw: Record<string, unknown>): RestaurantCard {
  const mapped = mapRestaurant(raw);
  return {
    ...mapped,
    id: mapped.id,
    name: mapped.name,
    imageUrl: mapped.imageUrl || mapped.coverUrl || mapped.logoUrl,
    rating: mapped.rating,
    cuisines: mapped.cuisines,
    deliveryTime: mapped.deliveryTime,
    priceForTwo: mapped.priceForTwo,
  };
}

export const customerApi = {
  /** GET /health */
  health: async (): Promise<boolean> => {
    try {
      const res = await request<unknown>('/api/v1/customer-service/health');
      return res.success !== false;
    } catch {
      return false;
    }
  },

  /** GET /customers/home */
  getHome: async (): Promise<HomeFeed> => {
    const res = await request<HomeFeed & Record<string, unknown>>(
      `${CUSTOMER_BASE}/home`
    );
    const data = (res.data ?? {}) as Record<string, unknown>;
    const banners = unwrapList(data.banners).map(mapBanner);
    return {
      banners,
      trending: unwrapList(data.trending).map(mapRestaurantCard),
      forYou: unwrapList(data.forYou).map(mapRestaurantCard),
      newlyAdded: unwrapList(data.newlyAdded).map(mapRestaurantCard),
    };
  },

  /** GET /customers/deals — also tries /customer-service/deals */
  getDeals: async (): Promise<Deal[]> => {
    try {
      const res = await request<unknown>(`${CUSTOMER_BASE}/deals`);
      const list = unwrapList(res.data ?? res);
      if (list.length) return list.map(mapDeal);
    } catch {
      // fall through
    }

    try {
      const res = await request<unknown>('/api/v1/customer-service/deals');
      const list = unwrapList(res.data ?? res);
      if (list.length) return list.map(mapDeal);
    } catch {
      // fall through
    }

    // Fallback: Fetch aggregate offers from all restaurants directly since the customer deals endpoint might throw 401
    try {
      const { restaurantApi } = await import('@/lib/restaurant/api');
      const { restaurantOffersApi } = await import('@/lib/restaurant/offers-api');
      
      const { restaurants } = await restaurantApi.getAllRestaurants({ limit: 100 });
console.log("Fetched " + restaurants.length + " restaurants for deals fallback");
      const offersPromises = restaurants.map(r => restaurantOffersApi.getOffers(r.id).catch(() => ({ offers: [] })));
      const results = await Promise.all(offersPromises);
      
      const allDeals = results.flatMap((res, i) => {
        return res.offers.map(offer => {
          return {
            id: offer.id,
            title: offer.title,
            description: offer.description,
            code: offer.code,
            imageUrl: offer.imageUrl,
            type: offer.type,
            value: offer.value,
            restaurantId: offer.restaurantId || restaurants[i].id
          } as Deal;
        });
      });
      
      if (allDeals.length > 0) return allDeals;
    } catch (e) {
      console.warn("Failed to fetch aggregate deals from restaurants:", e);
    }

    return [];
  },

  /** GET /customer-service/banners (optional dedicated banners route) */
  getBanners: async (): Promise<HomeBanner[]> => {
    try {
      const res = await request<unknown>('/api/v1/customer-service/banners');
      return unwrapList(res.data ?? res).map(mapBanner);
    } catch {
      return [];
    }
  },

  /** Combined offers for home ticker: banners + deals (deduped). */
  getOffersFeed: async (): Promise<{ banners: HomeBanner[]; deals: Deal[] }> => {
    const [home, deals, banners] = await Promise.all([
      customerApi.getHome().catch(() => ({
        banners: [] as HomeBanner[],
        trending: [],
        forYou: [],
        newlyAdded: [],
      })),
      customerApi.getDeals().catch(() => [] as Deal[]),
      customerApi.getBanners().catch(() => [] as HomeBanner[]),
    ]);

    const bannerMap = new Map<string, HomeBanner>();
    for (const b of [...home.banners, ...banners]) {
      if (!b.title?.trim()) continue;
      const key = `${b.id}|${b.title}`.toLowerCase();
      if (!bannerMap.has(key)) bannerMap.set(key, b);
    }

    return {
      banners: [...bannerMap.values()],
      deals,
    };
  },

  /** GET /customers/recommended */
  getRecommended: async (): Promise<Recommendation[]> => {
    const res = await request<Recommendation[]>(`${CUSTOMER_BASE}/recommended`);
    return Array.isArray(res.data) ? res.data : [];
  },

  /** GET /customers/me */
  getProfile: async (): Promise<CustomerProfile> => {
    const res = await request<Record<string, unknown>>(`${CUSTOMER_BASE}/me`);
    return mapProfile(res.data ?? {});
  },

  /** GET /customers/me/favorites */
  getFavorites: async (): Promise<RestaurantCard[]> => {
    try {
      const res = await request<unknown>(`${CUSTOMER_BASE}/me/favorites`);
      const payload = res.data ?? res;
      if (Array.isArray(payload)) {
        return payload.map((row) =>
          mapRestaurantCard((row ?? {}) as Record<string, unknown>)
        );
      }
      if (payload && typeof payload === 'object') {
        const obj = payload as Record<string, unknown>;
        const nested =
          obj.favorites ?? obj.restaurants ?? obj.items ?? obj.data;
        return unwrapList(nested).map(mapRestaurantCard);
      }
      return unwrapList(payload).map(mapRestaurantCard);
    } catch {
      return [];
    }
  },

  /** POST /customers/me/favorites/:restaurantId */
  addFavorite: async (restaurantId: string): Promise<void> => {
    await request(`${CUSTOMER_BASE}/me/favorites/${restaurantId}`, {
      method: 'POST',
    });
  },

  /** DELETE /customers/me/favorites/:restaurantId */
  removeFavorite: async (restaurantId: string): Promise<void> => {
    await request(`${CUSTOMER_BASE}/me/favorites/${restaurantId}`, {
      method: 'DELETE',
    });
  },

  /** GET /customers/me/recent */
  getRecent: async (): Promise<RecentActivity> => {
    const res = await request<RecentActivity>(`${CUSTOMER_BASE}/me/recent`);
    return {
      recentSearches: res.data?.recentSearches ?? [],
      recentRestaurants: res.data?.recentRestaurants ?? [],
    };
  },

  /** GET /customers/onboarding/status */
  getOnboardingStatus: async (): Promise<OnboardingStatus> => {
    const res = await request<OnboardingStatus>(
      `${CUSTOMER_BASE}/onboarding/status`
    );
    return {
      completed: res.data?.completed ?? false,
      currentStep: res.data?.currentStep ?? 0,
      totalSteps: res.data?.totalSteps ?? 0,
    };
  },

  /** POST /customers/onboarding/complete */
  completeOnboardingStep: async (step: number): Promise<OnboardingStatus> => {
    const res = await request<OnboardingStatus>(
      `${CUSTOMER_BASE}/onboarding/complete`,
      { method: 'POST', body: { step } }
    );
    return {
      completed: res.data?.completed ?? false,
      currentStep: res.data?.currentStep ?? step,
      totalSteps: res.data?.totalSteps ?? 0,
    };
  },

  /** POST /customers/support/tickets */
  createTicket: async (payload: CreateTicketPayload): Promise<SupportTicket> => {
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
      `${CUSTOMER_BASE}/support/tickets`,
      { method: 'POST', body }
    );
    return mapTicket((res.data as Record<string, unknown>) ?? {});
  },

  /** GET /customers/support/tickets */
  getTickets: async (): Promise<{
    tickets: SupportTicket[];
    meta?: PaginationMeta;
  }> => {
    const res = await request<unknown>(`${CUSTOMER_BASE}/support/tickets`);
    const list = unwrapList(res.data).map(mapTicket);
    // Fallback if API returns a bare array on envelope.data
    const tickets =
      list.length > 0
        ? list
        : Array.isArray(res.data)
          ? (res.data as Record<string, unknown>[]).map(mapTicket)
          : [];
    return { tickets, meta: res.meta };
  },

  /** GET /customers/support/tickets/:ticketId */
  getTicket: async (ticketId: string): Promise<SupportTicket> => {
    const res = await request<Record<string, unknown>>(
      `${CUSTOMER_BASE}/support/tickets/${ticketId}`
    );
    return mapTicket(res.data ?? {});
  },

  /** POST /customers/support/tickets/:ticketId/messages */
  addTicketMessage: async (
    ticketId: string,
    payload: AddTicketMessagePayload
  ): Promise<SupportTicket> => {
    const res = await request<Record<string, unknown>>(
      `${CUSTOMER_BASE}/support/tickets/${ticketId}/messages`,
      { method: 'POST', body: payload }
    );
    return mapTicket(res.data ?? {});
  },

  /** POST /customers/support/tickets/:ticketId/rate */
  rateTicket: async (
    ticketId: string,
    payload: RateTicketPayload
  ): Promise<SupportTicket> => {
    const res = await request<Record<string, unknown>>(
      `${CUSTOMER_BASE}/support/tickets/${ticketId}/rate`,
      { method: 'POST', body: payload }
    );
    return mapTicket(res.data ?? {});
  },
};
