import axios from 'axios';

import { api } from '@/lib/api';
import { handleCustomerServiceError } from '@/lib/customer/error-handler';
import type {
  ActiveSubscription,
  AddTicketMessagePayload,
  AppConfig,
  AppFeedbackPayload,
  CallbackRequestPayload,
  Collection,
  CollectionRestaurantsResult,
  CrashReportPayload,
  CreateTicketPayload,
  CustomerProfile,
  Deal,
  FaqItem,
  FavouriteDish,
  HomeBanner,
  HomeFeed,
  LoyaltyStatus,
  LoyaltyTransaction,
  OnboardingStatus,
  PaginationMeta,
  RateTicketPayload,
  RecentActivity,
  Recommendation,
  RestaurantCard,
  ScratchCard,
  SubscriptionPlan,
  SupportTicket,
  UpdateCustomerPrefsPayload,
} from '@/lib/customer/types';
import { mapRestaurant } from '@/lib/restaurant/mappers';
import { mapHomeFeedPayload } from '@/lib/home/feed-mappers';
import type { KitchenAlert } from '@/lib/restaurant/types';
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
  const favRaw =
    data.favoriteRestaurants ??
    data.favourites ??
    data.favorites ??
    data.favoriteRestaurantIds;
  const favoriteRestaurants = Array.isArray(favRaw)
    ? favRaw.map((x) =>
        typeof x === 'string'
          ? x
          : String(
              (x as { _id?: string; id?: string })?._id ??
                (x as { id?: string })?.id ??
                ''
            )
      ).filter(Boolean)
    : [];

  return {
    id: String(data._id ?? data.id ?? ''),
    userId: String(data.userId ?? data.customerId ?? ''),
    totalOrders: Number(data.totalOrders ?? data.ordersCount ?? 0),
    totalSpend: Number(data.totalSpend ?? data.spend ?? 0),
    averageOrderValue: Number(data.averageOrderValue ?? data.aov ?? 0),
    favoriteRestaurants,
    favoriteDishes: Array.isArray(data.favoriteDishes)
      ? (data.favoriteDishes as string[]).map(String)
      : [],
    recentSearches: Array.isArray(data.recentSearches)
      ? (data.recentSearches as string[]).map(String)
      : [],
    recentRestaurants: Array.isArray(data.recentRestaurants)
      ? (data.recentRestaurants as string[]).map(String)
      : [],
    tier: String(data.tier ?? data.loyaltyTier ?? 'bronze'),
    loyaltyPoints: Number(data.loyaltyPoints ?? data.points ?? 0),
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

  const rawMessages = (data.messages as Record<string, unknown>[] | undefined) ?? [];
  const messages = rawMessages.map((m, i) => ({
    id: String(m.messageId ?? m._id ?? m.id ?? i),
    sender: String(m.sender ?? ''),
    senderRole: String(m.sender ?? m.senderRole ?? 'customer'),
    content: String(m.content ?? ''),
    createdAt: m.sentAt ? String(m.sentAt) : m.createdAt ? String(m.createdAt) : undefined,
  }));

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
    attachments: (data.attachments as string[]) ?? [],
    messages,
    rating: (data.satisfactionRating ?? data.rating) as number | undefined,
    feedback: (data.satisfactionFeedback ?? data.feedback) as string | undefined,
    resolution: data.resolution != null ? String(data.resolution) : null,
    resolutionType: data.resolutionType != null ? String(data.resolutionType) : null,
    refundId: data.refundId != null ? String(data.refundId) : null,
    compensationAmount:
      data.compensationAmount != null ? Number(data.compensationAmount) : null,
    resolvedAt: data.resolvedAt ? String(data.resolvedAt) : null,
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
    record.favorites ??
    record.restaurants ??
    record.recommendations ??
    record.trending ??
    record.forYou ??
    record.newlyAdded ??
    record.featured ??
    record.featuredRestaurants ??
    record.data;
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  if (nested && typeof nested === 'object') {
    const inner = nested as Record<string, unknown>;
    const list =
      inner.deals ??
      inner.banners ??
      inner.offers ??
      inner.items ??
      inner.favorites ??
      inner.restaurants ??
      inner.recommendations;
    if (Array.isArray(list)) return list as Record<string, unknown>[];
  }
  return [];
}

function pickRestaurantList(
  data: Record<string, unknown>,
  ...keys: string[]
): RestaurantCard[] {
  for (const key of keys) {
    const list = unwrapList(data[key]);
    if (list.length) return list.map(mapRestaurantCard);
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
    subtitle:
      (raw.subtitle as string | undefined) ??
      (raw.description as string | undefined),
    imageUrl:
      (raw.imageUrl as string | undefined) ??
      (raw.image as string | undefined) ??
      (raw.bannerUrl as string | undefined),
    deepLink:
      (raw.deepLink as string | undefined) ??
      (raw.link as string | undefined) ??
      (raw.href as string | undefined),
    couponCode:
      (raw.couponCode as string | undefined) ??
      (raw.code as string | undefined),
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

function asRecord(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' && !Array.isArray(v))
    ? (v as Record<string, unknown>)
    : {};
}

function mapCollection(raw: Record<string, unknown>, index: number): Collection {
  return {
    id: String(raw._id ?? raw.id ?? `col-${index}`),
    title: String(raw.title ?? raw.name ?? raw.heading ?? 'Collection'),
    slug: String(raw.slug ?? raw.name ?? raw.title ?? `col-${index}`)
      .toLowerCase().replace(/\s+/g, '-'),
    imageUrl: (raw.imageUrl as string) || (raw.image as string) || (raw.coverUrl as string) || undefined,
    description: (raw.description as string) || undefined,
    restaurantCount: typeof raw.restaurantCount === 'number' ? raw.restaurantCount : undefined,
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : index,
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

  /** GET /health/ready — Mongo + Redis readiness */
  healthReady: async (): Promise<boolean> => {
    try {
      const res = await request<unknown>('/api/v1/customer-service/health/ready');
      return res.success !== false;
    } catch {
      return false;
    }
  },

  /** GET /customers/config — splash: versions, forceUpdate, cities, flags */
  getConfig: async (): Promise<AppConfig> => {
    try {
      const res = await request<Record<string, unknown>>(`${CUSTOMER_BASE}/config`);
      const data = (res.data ?? res ?? {}) as Record<string, unknown>;
      return {
        minVersion: (data.minVersion as string) || (data.minimumVersion as string) || undefined,
        latestVersion: (data.latestVersion as string) || undefined,
        forceUpdate: Boolean(data.forceUpdate ?? data.force_update ?? false),
        maintenanceMode: Boolean(data.maintenanceMode ?? data.maintenance ?? false),
        maintenanceMessage: (data.maintenanceMessage as string) || undefined,
        cities: Array.isArray(data.cities)
          ? (data.cities as Record<string, unknown>[]).map((c) => ({
              id: String(c._id ?? c.id ?? ''),
              name: String(c.name ?? ''),
              slug: (c.slug as string) || undefined,
              isActive: c.isActive !== undefined ? Boolean(c.isActive) : true,
            }))
          : [],
        flags: (data.flags as Record<string, boolean | string | number>) || {},
        announcement: data.announcement
          ? {
              message: String((data.announcement as Record<string, unknown>).message ?? ''),
              type: (data.announcement as Record<string, unknown>).type as 'info' | 'warning' | 'success' | undefined,
            }
          : null,
      };
    } catch {
      return {};
    }
  },

  /** GET /customers/home?lat=&lng=&radius= — location-aware home rails */
  getHome: async (coords?: {
    lat: number;
    lng: number;
    radius?: number;
  }): Promise<HomeFeed> => {
    const params = new URLSearchParams();
    if (coords?.lat != null && coords?.lng != null) {
      params.set('lat', String(coords.lat));
      params.set('lng', String(coords.lng));
      if (coords.radius != null) {
        params.set('radius', String(coords.radius));
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await request<HomeFeed & Record<string, unknown>>(
      `${CUSTOMER_BASE}/home${qs}`
    );
    const data = (res.data ?? res ?? {}) as Record<string, unknown>;
    const banners = unwrapList(
      data.banners ?? data.banner ?? data.promos
    ).map(mapBanner);

    return mapHomeFeedPayload(data, banners);
  },

  /** GET /customers/deals?lat=&lng=&radius= — deals near delivery pin */
  getDeals: async (coords?: {
    lat: number;
    lng: number;
    radius?: number;
  }): Promise<Deal[]> => {
    const params = new URLSearchParams();
    if (coords?.lat != null && coords?.lng != null) {
      params.set('lat', String(coords.lat));
      params.set('lng', String(coords.lng));
      if (coords.radius != null) {
        params.set('radius', String(coords.radius));
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await request<unknown>(`${CUSTOMER_BASE}/deals${qs}`);
      const list = unwrapList(res.data ?? res);
      if (list.length) return list.map(mapDeal);
    } catch {
      // fall through
    }

    try {
      const res = await request<unknown>(`/api/v1/customer-service/deals${qs}`);
      const list = unwrapList(res.data ?? res);
      if (list.length) return list.map(mapDeal);
    } catch {
      // fall through
    }

    if (!coords?.lat || !coords?.lng) {
      return [];
    }

    // Fallback when geo deals endpoint unavailable
    try {
      const { restaurantApi } = await import('@/lib/restaurant/api');
      const { restaurantOffersApi } = await import('@/lib/restaurant/offers-api');

      const { restaurants } = await restaurantApi.getAllRestaurants({ limit: 100 });
      const offersPromises = restaurants.map((r) =>
        restaurantOffersApi.getOffers(r.id).catch(() => ({ offers: [] }))
      );
      const results = await Promise.all(offersPromises);

      const allDeals = results.flatMap((res, i) => {
        return res.offers.map((offer) => {
          return {
            id: offer.id,
            title: offer.title,
            description: offer.description,
            code: offer.code,
            imageUrl: offer.imageUrl,
            type: offer.type,
            value: offer.value,
            restaurantId: offer.restaurantId || restaurants[i].id,
          } as Deal;
        });
      });

      if (allDeals.length > 0) return allDeals;
    } catch (e) {
      console.warn('Failed to fetch aggregate deals from restaurants:', e);
    }

    return [];
  },

  /** GET /customers/banners — CMS promo banners */
  getBanners: async (city?: string): Promise<HomeBanner[]> => {
    try {
      const qs = city ? `?city=${encodeURIComponent(city)}` : '';
      const res = await request<unknown>(`${CUSTOMER_BASE}/banners${qs}`);
      return unwrapList(res.data ?? res).map(mapBanner);
    } catch {
      return [];
    }
  },

  /** CMS banners + geo deals for home promos */
  getOffersFeed: async (coords?: {
    lat: number;
    lng: number;
    radius?: number;
  }): Promise<{ banners: HomeBanner[]; deals: Deal[] }> => {
    const [banners, deals] = await Promise.all([
      customerApi.getBanners().catch(() => [] as HomeBanner[]),
      customerApi.getDeals(coords).catch(() => [] as Deal[]),
    ]);
    return { banners, deals };
  },

  /** GET /customers/recommended */
  getRecommended: async (): Promise<Recommendation[]> => {
    try {
      const res = await request<unknown>(`${CUSTOMER_BASE}/recommended`);
      const payload = (res.data ?? res) as unknown;
      if (Array.isArray(payload)) {
        return payload.map((row) =>
          mapRestaurantCard((row ?? {}) as Record<string, unknown>)
        );
      }
      if (payload && typeof payload === 'object') {
        const obj = payload as Record<string, unknown>;
        return pickRestaurantList(
          obj,
          'recommendations',
          'restaurants',
          'forYou',
          'items',
          'data'
        );
      }
      return unwrapList(payload).map(mapRestaurantCard);
    } catch {
      return [];
    }
  },

  /** GET /customers/me/alerts — proxies restaurant kitchen/stock subscriptions */
  getMyAlerts: async (): Promise<KitchenAlert[]> => {
    const res = await request<unknown>(`${CUSTOMER_BASE}/me/alerts`);
    const payload = res.data ?? res;
    const rows = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object'
        ? unwrapList(
            (payload as Record<string, unknown>).alerts ??
              (payload as Record<string, unknown>).items ??
              (payload as Record<string, unknown>).data ??
              payload
          )
        : [];
    return (Array.isArray(rows) ? rows : unwrapList(rows)).map((row) =>
      mapKitchenAlert((row ?? {}) as Record<string, unknown>)
    );
  },

  /** GET /customers/me */
  getProfile: async (): Promise<CustomerProfile> => {
    const res = await request<Record<string, unknown>>(`${CUSTOMER_BASE}/me`);
    const data = (res.data ?? res ?? {}) as Record<string, unknown>;
    return mapProfile(data);
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

  /** POST /customers/support/attachments/upload — multipart image → Cloudinary URL */
  uploadSupportAttachment: async (localUri: string): Promise<string> => {
    const form = new FormData();
    const name = localUri.split('/').pop() ?? 'evidence.jpg';
    form.append('image', {
      uri: localUri,
      name,
      type: 'image/jpeg',
    } as unknown as Blob);

    try {
      const response = await api.post<Envelope<{ url?: string; imageUrl?: string }>>(
        `${CUSTOMER_BASE}/support/attachments/upload`,
        form,
        { headers: { Accept: 'application/json' } },
      );
      const url = response.data?.data?.url ?? response.data?.data?.imageUrl;
      if (!url) throw new Error('Upload did not return a URL');
      return url;
    } catch (error) {
      const customerError = handleCustomerServiceError(error);
      throw new Error(customerError.userMessage);
    }
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

  /** GET /customers/collections — collection rails */
  getCollections: async (): Promise<Collection[]> => {
    try {
      const res = await request<unknown>(`${CUSTOMER_BASE}/collections`);
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as Record<string, unknown>)?.collections)
          ? (res.data as Record<string, unknown>).collections as unknown[]
          : unwrapList(res.data ?? res);
      return (list as Record<string, unknown>[])
        .map(mapCollection)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    } catch {
      return [];
    }
  },

  /** GET /customers/collections/:slug — restaurants in a collection */
  getCollectionRestaurants: async (
    slug: string,
    page = 1
  ): Promise<CollectionRestaurantsResult> => {
    const res = await request<unknown>(
      `${CUSTOMER_BASE}/collections/${encodeURIComponent(slug)}?page=${page}&limit=20`
    );
    const data = (res.data ?? res ?? {}) as Record<string, unknown>;
    const colRaw = asRecord(data.collection ?? data);
    const collection = mapCollection(colRaw, 0);
    const restList = unwrapList(data.restaurants ?? data.items ?? data.data ?? data);
    return {
      collection,
      restaurants: restList.map(mapRestaurantCard),
      meta: res.meta,
    };
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

  /** POST /customers/support/tickets/:ticketId/close */
  closeTicket: async (ticketId: string): Promise<SupportTicket> => {
    const res = await request<Record<string, unknown>>(
      `${CUSTOMER_BASE}/support/tickets/${ticketId}/close`,
      { method: 'POST', body: {} }
    );
    return mapTicket(res.data ?? {});
  },

  /** POST /customers/support/tickets/:ticketId/reopen */
  reopenTicket: async (ticketId: string, reason: string): Promise<SupportTicket> => {
    const res = await request<Record<string, unknown>>(
      `${CUSTOMER_BASE}/support/tickets/${ticketId}/reopen`,
      { method: 'POST', body: { reason } }
    );
    return mapTicket(res.data ?? {});
  },

  /** POST /customers/support/callback */
  requestCallback: async (payload: CallbackRequestPayload): Promise<void> => {
    await request(`${CUSTOMER_BASE}/support/callback`, {
      method: 'POST',
      body: payload,
    });
  },

  /** GET /customers/support/faq */
  getFaqs: async (): Promise<FaqItem[]> => {
    try {
      const res = await request<unknown>(`${CUSTOMER_BASE}/support/faq`);
      const rows = unwrapList(res.data ?? res);
      return rows.map((raw) => ({
        id: String(raw._id ?? raw.id ?? ''),
        question: String(raw.question ?? raw.title ?? raw.q ?? ''),
        answer: (raw.answer ?? raw.body ?? raw.content ?? raw.a) as string | undefined,
        category: raw.category as string | undefined,
        sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : undefined,
      }));
    } catch {
      return [];
    }
  },

  /** GET /customers/support/faq/:faqId */
  getFaq: async (faqId: string): Promise<FaqItem> => {
    const res = await request<Record<string, unknown>>(
      `${CUSTOMER_BASE}/support/faq/${faqId}`
    );
    const raw = (res.data ?? res ?? {}) as Record<string, unknown>;
    return {
      id: String(raw._id ?? raw.id ?? faqId),
      question: String(raw.question ?? raw.title ?? raw.q ?? ''),
      answer: (raw.answer ?? raw.body ?? raw.content ?? raw.a) as string | undefined,
      category: raw.category as string | undefined,
    };
  },

  /** PUT /customers/me — update veg preference, cuisine prefs */
  updatePrefs: async (payload: UpdateCustomerPrefsPayload): Promise<CustomerProfile> => {
    const res = await request<Record<string, unknown>>(`${CUSTOMER_BASE}/me`, {
      method: 'PUT',
      body: payload,
    });
    return mapProfile((res.data ?? res ?? {}) as Record<string, unknown>);
  },

  /** GET /customers/me/favorites/dishes */
  getFavouriteDishes: async (): Promise<FavouriteDish[]> => {
    try {
      const res = await request<unknown>(`${CUSTOMER_BASE}/me/favorites/dishes`);
      const rows = unwrapList(
        Array.isArray(res.data) ? res.data
          : (res.data as Record<string, unknown>)?.dishes
          ?? (res.data as Record<string, unknown>)?.items
          ?? res.data
          ?? res
      );
      return rows.map((raw) => ({
        id: String(raw._id ?? raw.id ?? ''),
        name: String(raw.name ?? raw.itemName ?? ''),
        imageUrl: (raw.imageUrl ?? raw.image) as string | undefined,
        price: typeof raw.price === 'number' ? raw.price : typeof raw.basePrice === 'number' ? raw.basePrice : undefined,
        restaurantId: (raw.restaurantId ?? raw.restaurant_id) as string | undefined,
        restaurantName: (raw.restaurantName ?? raw.restaurant?.name) as string | undefined,
        isVeg: raw.isVeg as boolean | undefined,
        rating: typeof raw.rating === 'number' ? raw.rating : undefined,
        ...raw,
      }));
    } catch {
      return [];
    }
  },

  /** POST /customers/me/favorites/dishes/:itemId */
  addFavouriteDish: async (itemId: string, restaurantId: string): Promise<void> => {
    await request(`${CUSTOMER_BASE}/me/favorites/dishes/${itemId}`, {
      method: 'POST',
      body: { restaurantId },
    });
  },

  /** DELETE /customers/me/favorites/dishes/:itemId */
  removeFavouriteDish: async (itemId: string): Promise<void> => {
    await request(`${CUSTOMER_BASE}/me/favorites/dishes/${itemId}`, {
      method: 'DELETE',
    });
  },

  /** GET /customers/loyalty */
  getLoyalty: async (): Promise<LoyaltyStatus> => {
    try {
      const res = await request<Record<string, unknown>>(`${CUSTOMER_BASE}/loyalty`);
      const d = (res.data ?? res ?? {}) as Record<string, unknown>;
      return {
        points: typeof d.points === 'number' ? d.points : 0,
        tier: String(d.tier ?? d.level ?? 'bronze'),
        tierLabel: (d.tierLabel ?? d.tierName) as string | undefined,
        nextTierPoints: typeof d.nextTierPoints === 'number' ? d.nextTierPoints : undefined,
        expiringPoints: typeof d.expiringPoints === 'number' ? d.expiringPoints : undefined,
        expiringDate: (d.expiringDate ?? d.expiresAt) as string | undefined,
      };
    } catch {
      return { points: 0, tier: 'bronze' };
    }
  },

  /** GET /customers/loyalty/history */
  getLoyaltyHistory: async (): Promise<LoyaltyTransaction[]> => {
    try {
      const res = await request<unknown>(`${CUSTOMER_BASE}/loyalty/history`);
      const rows = unwrapList(
        (res.data as Record<string, unknown>)?.transactions
        ?? (res.data as Record<string, unknown>)?.history
        ?? res.data
        ?? res
      );
      return rows.map((raw) => ({
        id: String(raw._id ?? raw.id ?? ''),
        type: String(raw.type ?? raw.action ?? 'earn') as LoyaltyTransaction['type'],
        points: typeof raw.points === 'number' ? raw.points : 0,
        description: (raw.description ?? raw.label ?? raw.title) as string | undefined,
        orderId: (raw.orderId ?? raw.order_id) as string | undefined,
        createdAt: String(raw.createdAt ?? raw.date ?? ''),
      }));
    } catch {
      return [];
    }
  },

  /** GET /customers/subscriptions/plans */
  getSubscriptionPlans: async (): Promise<SubscriptionPlan[]> => {
    try {
      const res = await request<unknown>(`${CUSTOMER_BASE}/subscriptions/plans`);
      const rows = unwrapList(
        (res.data as Record<string, unknown>)?.plans
        ?? res.data
        ?? res
      );
      return rows.map((raw) => ({
        id: String(raw._id ?? raw.id ?? ''),
        name: String(raw.name ?? raw.title ?? ''),
        description: (raw.description ?? raw.subtitle) as string | undefined,
        price: typeof raw.price === 'number' ? raw.price : 0,
        durationDays: typeof raw.durationDays === 'number' ? raw.durationDays : undefined,
        benefits: Array.isArray(raw.benefits) ? (raw.benefits as string[]) : [],
        badgeColor: raw.badgeColor as string | undefined,
        isPopular: Boolean(raw.isPopular ?? raw.featured ?? false),
      }));
    } catch {
      return [];
    }
  },

  /** GET /customers/subscriptions/me */
  getMySubscription: async (): Promise<ActiveSubscription> => {
    try {
      const res = await request<Record<string, unknown>>(`${CUSTOMER_BASE}/subscriptions/me`);
      const d = (res.data ?? res ?? null) as Record<string, unknown> | null;
      if (!d || !d.id) return null;
      return {
        id: String(d._id ?? d.id),
        planId: String(d.planId ?? d.plan ?? ''),
        planName: String(d.planName ?? d.name ?? ''),
        status: String(d.status ?? 'active'),
        startDate: (d.startDate ?? d.start) as string | undefined,
        endDate: (d.endDate ?? d.end ?? d.expiresAt) as string | undefined,
        cancelAtPeriodEnd: Boolean(d.cancelAtPeriodEnd ?? d.cancelAt ?? false),
      };
    } catch {
      return null;
    }
  },

  /** POST /customers/subscriptions/cancel */
  cancelSubscription: async (): Promise<void> => {
    await request(`${CUSTOMER_BASE}/subscriptions/cancel`, {
      method: 'POST',
      body: {},
    });
  },

  /** GET /customers/scratch-cards */
  getScratchCards: async (): Promise<ScratchCard[]> => {
    try {
      const res = await request<unknown>(`${CUSTOMER_BASE}/scratch-cards`);
      const rows = unwrapList(
        (res.data as Record<string, unknown>)?.cards
        ?? (res.data as Record<string, unknown>)?.scratchCards
        ?? res.data
        ?? res
      );
      return rows.map((raw) => ({
        id: String(raw._id ?? raw.id ?? ''),
        status: String(raw.status ?? 'pending') as ScratchCard['status'],
        reward: (raw.reward ?? raw.title) as string | undefined,
        couponCode: (raw.couponCode ?? raw.code) as string | undefined,
        discount: typeof raw.discount === 'number' ? raw.discount : undefined,
        expiresAt: (raw.expiresAt ?? raw.expiryDate) as string | undefined,
        orderId: (raw.orderId ?? raw.order_id) as string | undefined,
      }));
    } catch {
      return [];
    }
  },

  /** POST /customers/scratch-cards/:cardId/reveal */
  revealScratchCard: async (cardId: string): Promise<ScratchCard> => {
    const res = await request<Record<string, unknown>>(
      `${CUSTOMER_BASE}/scratch-cards/${cardId}/reveal`,
      { method: 'POST', body: {} }
    );
    const raw = (res.data ?? res ?? {}) as Record<string, unknown>;
    return {
      id: String(raw._id ?? raw.id ?? cardId),
      status: String(raw.status ?? 'revealed') as ScratchCard['status'],
      reward: (raw.reward ?? raw.title) as string | undefined,
      couponCode: (raw.couponCode ?? raw.code) as string | undefined,
      discount: typeof raw.discount === 'number' ? raw.discount : undefined,
      expiresAt: (raw.expiresAt ?? raw.expiryDate) as string | undefined,
      orderId: (raw.orderId ?? raw.order_id) as string | undefined,
    };
  },

  /** POST /customers/app/crash-report */
  reportCrash: async (payload: CrashReportPayload): Promise<void> => {
    try {
      await request(`${CUSTOMER_BASE}/app/crash-report`, {
        method: 'POST',
        body: payload,
      });
    } catch {
      // fire-and-forget: crash reporting must never throw
    }
  },

  /** POST /customers/app/feedback */
  submitFeedback: async (payload: AppFeedbackPayload): Promise<void> => {
    await request(`${CUSTOMER_BASE}/app/feedback`, {
      method: 'POST',
      body: payload,
    });
  },
};
