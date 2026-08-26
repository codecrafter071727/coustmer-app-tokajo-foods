import type { HomeBanner, HomeFeed } from '@/lib/customer/types';
import type {
  HomeOrderAgainCard,
  HomeRestaurantCard,
  HomeTrendingDish,
} from '@/lib/home/types';
import { isPlaceholderListingEta } from '@/lib/restaurant/card-display';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

export function mapFeedRestaurantCard(raw: unknown): HomeRestaurantCard | null {
  const r = asRecord(raw);
  const id = str(r.restaurantId ?? r._id ?? r.id);
  if (!id) return null;

  const cuisines = Array.isArray(r.cuisines)
    ? (r.cuisines as unknown[]).map(String).filter(Boolean)
    : undefined;

  return {
    id,
    name: str(r.name) ?? 'Restaurant',
    image:
      str(r.image) ??
      str(r.imageUrl) ??
      str(r.logo) ??
      str(r.logoUrl) ??
      null,
    rating: (() => {
      const nested = asRecord(r.ratings);
      const n = num(r.avgRating ?? r.rating ?? nested.average ?? nested.avgRating);
      return n != null && n > 0 ? n : undefined;
    })(),
    deliveryTime: (() => {
      if (r.travelIncluded === false) return null;
      const label =
        str(r.etaLabel) ??
        str(r.deliveryTimeLabel) ??
        str(r.deliveryTime) ??
        null;
      if (!label) return null;
      if (isPlaceholderListingEta(label)) return null;
      return label;
    })(),
    cuisines,
    isPureVeg: r.isPureVeg === true,
    isOpenNow: typeof r.isOpenNow === 'boolean' ? r.isOpenNow : undefined,
    availabilityLabel: str(r.availabilityLabel) ?? null,
    hoursToday: str(r.hoursToday) ?? null,
    reviewCount: (() => {
      const nested = asRecord(r.ratings);
      const n = num(r.totalRatings ?? r.reviewCount ?? nested.count ?? nested.total);
      return n != null && n > 0 ? n : undefined;
    })(),
    distanceKm: num(r.distanceKm),
    slug: str(r.slug) ?? null,
    hasOffers: r.hasOffers === true,
  };
}

export function mapFeedOrderAgainCard(raw: unknown): HomeOrderAgainCard | null {
  const base = mapFeedRestaurantCard(raw);
  if (!base) return null;
  const r = asRecord(raw);
  return {
    ...base,
    lastOrderedAt: str(r.lastOrderedAt) ?? null,
    itemsSummary: str(r.itemsSummary) ?? null,
  };
}

export function mapFeedDishCard(raw: unknown): HomeTrendingDish | null {
  const r = asRecord(raw);
  const id = str(r.itemId ?? r._id ?? r.id);
  const restaurantId = str(r.restaurantId);
  if (!id || !restaurantId) return null;

  return {
    id,
    name: str(r.name) ?? 'Dish',
    price: num(r.price) ?? 0,
    imageUrl: str(r.image ?? r.imageUrl) ?? null,
    isVeg: typeof r.isVeg === 'boolean' ? r.isVeg : undefined,
    rating: num(r.rating),
    restaurantId,
    restaurantName: str(r.restaurantName) ?? 'Restaurant',
    badge: str(r.badge) ?? null,
  };
}

function mapFeedRestaurantList(raw: unknown): HomeRestaurantCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(mapFeedRestaurantCard)
    .filter((c): c is HomeRestaurantCard => c != null);
}

function mapFeedOrderAgainList(raw: unknown): HomeOrderAgainCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(mapFeedOrderAgainCard)
    .filter((c): c is HomeOrderAgainCard => c != null);
}

function mapFeedDishList(raw: unknown): HomeTrendingDish[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(mapFeedDishCard)
    .filter((c): c is HomeTrendingDish => c != null);
}

export function mapHomeFeedPayload(
  data: Record<string, unknown>,
  banners: HomeBanner[]
): HomeFeed {
  return {
    banners,
    radiusKm: num(data.radiusKm) ?? 15,
    vegOnly: data.vegOnly === true,
    trending: mapFeedRestaurantList(data.trending),
    newlyAdded: mapFeedRestaurantList(data.newlyAdded),
    topRated: mapFeedRestaurantList(data.topRated),
    pureVeg: mapFeedRestaurantList(data.pureVeg),
    forYou: mapFeedRestaurantList(data.forYou),
    orderAgain: mapFeedOrderAgainList(data.orderAgain),
    dishesToTry: mapFeedDishList(data.dishesToTry),
    trendingDishes: mapFeedDishList(data.trendingDishes),
  };
}
