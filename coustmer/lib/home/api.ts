import axios from 'axios';

import { api } from '@/lib/api';
import type {
  HomeCategory,
  HomeDiscovery,
  HomeRestaurantCard,
  HomeTrendingDish,
} from '@/lib/home/types';
import { resolveMediaUrl } from '@/lib/restaurant/media';

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

/** Future discovery routes — first that returns data wins. */
const DISCOVERY_PATHS = [
  '/api/v1/customer-service/discovery/home',
  '/api/v1/customer-service/customers/home/discovery',
  '/api/v1/customer-service/home/discovery',
];

function unwrapList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  const nested =
    record.items ??
    record.results ??
    record.docs ??
    record.restaurants ??
    record.dishes ??
    record.categories ??
    record.data;
  return Array.isArray(nested) ? (nested as Record<string, unknown>[]) : [];
}

function mapRestaurantCard(raw: Record<string, unknown>): HomeRestaurantCard {
  const image =
    resolveMediaUrl(
      (raw.imageUrl as string) ||
        (raw.coverUrl as string) ||
        (raw.logoUrl as string) ||
        (raw.image as string)
    ) || undefined;

  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? raw.restaurantName ?? 'Restaurant'),
    imageUrl: image,
    coverUrl:
      resolveMediaUrl((raw.coverUrl as string) || (raw.bannerUrl as string)) ||
      image,
    logoUrl: resolveMediaUrl(raw.logoUrl as string),
    rating:
      typeof raw.rating === 'number'
        ? raw.rating
        : Number(raw.avgRating ?? raw.rating) || undefined,
    reviewCount:
      typeof raw.reviewCount === 'number'
        ? raw.reviewCount
        : Number(raw.totalReviews ?? raw.reviews) || undefined,
    cuisines: Array.isArray(raw.cuisines)
      ? (raw.cuisines as string[]).map(String)
      : undefined,
    deliveryTime:
      (raw.deliveryTime as string) ||
      (raw.avgDeliveryTime as string) ||
      undefined,
    priceForTwo:
      typeof raw.priceForTwo === 'number'
        ? raw.priceForTwo
        : Number(raw.costForTwo ?? raw.priceForTwo) || undefined,
    city: (raw.city as string) || undefined,
    address:
      typeof raw.address === 'string'
        ? raw.address
        : undefined,
    isNew: Boolean(raw.isNew ?? raw.newlyAdded ?? true),
    badge: (raw.badge as string) || (raw.tag as string) || 'NEW',
  };
}

function mapTrendingDish(raw: Record<string, unknown>): HomeTrendingDish {
  const restaurant =
    (raw.restaurant as Record<string, unknown> | undefined) ?? {};

  return {
    id: String(raw._id ?? raw.id ?? raw.itemId ?? ''),
    name: String(raw.name ?? raw.title ?? 'Dish'),
    price: Number(raw.price ?? raw.basePrice ?? 0),
    imageUrl: resolveMediaUrl(
      (raw.imageUrl as string) || (raw.image as string)
    ),
    isVeg: raw.isVeg !== undefined ? Boolean(raw.isVeg) : undefined,
    rating:
      typeof raw.rating === 'number'
        ? raw.rating
        : Number(raw.avgRating ?? raw.rating) || undefined,
    restaurantId: String(
      raw.restaurantId ?? restaurant._id ?? restaurant.id ?? ''
    ),
    restaurantName: String(
      raw.restaurantName ?? restaurant.name ?? 'Restaurant'
    ),
    restaurantImageUrl: resolveMediaUrl(
      (raw.restaurantImageUrl as string) ||
        (restaurant.imageUrl as string) ||
        (restaurant.coverUrl as string)
    ),
    badge: (raw.badge as string) || (raw.tag as string) || undefined,
  };
}

function mapCategory(raw: Record<string, unknown>, index: number): HomeCategory {
  return {
    id: String(raw._id ?? raw.id ?? raw.slug ?? `cat-${index}`),
    label: String(raw.label ?? raw.name ?? raw.title ?? 'Category'),
    slug: String(raw.slug ?? raw.name ?? raw.label ?? `cat-${index}`)
      .toLowerCase()
      .replace(/\s+/g, '-'),
    imageUrl: String(
      raw.imageUrl ?? raw.image ?? raw.iconUrl ?? raw.photoUrl ?? ''
    ),
    color: (raw.color as string) || undefined,
    sortOrder:
      typeof raw.sortOrder === 'number' ? raw.sortOrder : index,
  };
}

function mapDiscoveryPayload(data: Record<string, unknown>): HomeDiscovery | null {
  const newlyAdded = unwrapList(
    data.newlyAdded ?? data.newly_added ?? data.newRestaurants
  )
    .map(mapRestaurantCard)
    .filter((r) => r.id && r.name);

  const trendingDishes = unwrapList(
    data.trendingDishes ?? data.trending_dishes ?? data.trendingFood ?? data.trending
  )
    .map(mapTrendingDish)
    .filter((d) => d.id && d.name && d.restaurantId && d.price > 0);

  const categories = unwrapList(data.categories ?? data.foodCategories)
    .map(mapCategory)
    .filter((c) => c.slug && c.label && c.imageUrl)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (!newlyAdded.length && !trendingDishes.length && !categories.length) {
    return null;
  }

  return {
    newlyAdded,
    trendingDishes,
    categories,
    isDummy: false,
  };
}

async function fetchDiscoveryFromPath(
  path: string,
  city?: string
): Promise<HomeDiscovery | null> {
  const res = await api.get<Envelope<Record<string, unknown>> | Record<string, unknown>>(
    path,
    {
      params: city ? { city } : undefined,
      withCredentials: true,
    }
  );

  const body = res.data as Envelope<Record<string, unknown>> & Record<string, unknown>;
  const data = (body.data ?? body) as Record<string, unknown>;
  return mapDiscoveryPayload(data);
}

/** Loads home discovery rails from the backend. Returns empty arrays if no endpoint responds. */
export async function getHomeDiscovery(city?: string): Promise<HomeDiscovery> {
  for (const path of DISCOVERY_PATHS) {
    try {
      const mapped = await fetchDiscoveryFromPath(path, city);
      if (mapped) {
        return {
          newlyAdded: mapped.newlyAdded,
          trendingDishes: mapped.trendingDishes,
          categories: mapped.categories,
          isDummy: false,
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        // 404/501 = endpoint not built yet — keep trying / fall through
        if (status && status !== 404 && status !== 501 && status !== 405) {
          // auth or server errors: still show empty so home stays usable
        }
      }
    }
  }

  // Return empty discovery — no dummy/static data
  return { newlyAdded: [], trendingDishes: [], categories: [], isDummy: false };
}

export const homeDiscoveryApi = {
  getHomeDiscovery,
};
