import type { Restaurant } from '@/lib/restaurant/types';
import { restaurantMatchesCategory } from '@/lib/restaurant/categories';

export type HomeSortId =
  | 'relevance'
  | 'nearest'
  | 'rating'
  | 'fastest'
  | 'cost_low'
  | 'cost_high';

export type HomeCuisineId = string;

export type DishPriceBand = 'any' | 'under_200' | '200_350' | 'above_350';

export type DeliveryTimeBand = 'any' | 'under_20' | 'under_30' | 'under_45';

export type RatingBand = 'any' | '4.5' | '4.0' | '3.5';

export type FilterSheetTab =
  | 'sort'
  | 'time'
  | 'rating'
  | 'offers'
  | 'price'
  | 'trust';

export type HomeFilterState = {
  /** `popular` or any cuisine / menu-category slug from the API. */
  cuisine: HomeCuisineId;
  sort: HomeSortId;
  ratingBand: RatingBand;
  timeBand: DeliveryTimeBand;
  priceBand: DishPriceBand;
  offersOnly: boolean;
  pureVeg: boolean;
  /** @deprecated Stub — hidden from UI; kept for persisted state. */
  noPackagingCharge: boolean;
  /** @deprecated Stub — hidden from UI; kept for persisted state. */
  lowPlastic: boolean;
  /** Server-side GET /restaurants/nearby?hygiene=1 (score ≥ 4). Off by default. */
  hygieneRatedOnly: boolean;
  /** Prefer nearby restaurants (distance). */
  nearOnly: boolean;
};

export const DEFAULT_HOME_FILTERS: HomeFilterState = {
  cuisine: 'popular',
  sort: 'relevance',
  ratingBand: 'any',
  timeBand: 'any',
  priceBand: 'any',
  offersOnly: false,
  pureVeg: false,
  noPackagingCharge: false,
  lowPlastic: false,
  hygieneRatedOnly: false,
  nearOnly: false,
};

/** Fallback chips when live categories have not loaded yet. */
export const HOME_CUISINES: {
  id: HomeCuisineId;
  label: string;
  emoji?: string;
}[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'fast_food', label: 'Fast Food', emoji: '🍔' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'biryani', label: 'Biryani', emoji: '🍛' },
  { id: 'chinese', label: 'Chinese', emoji: '🥟' },
  { id: 'burger', label: 'Burger', emoji: '🍔' },
  { id: 'desserts', label: 'Desserts', emoji: '🍰' },
  { id: 'south_indian', label: 'South Indian', emoji: '🥘' },
];

/** Backend `sort=cost` is ascending only — one cost option in the sheet. */
export const HOME_SORT_OPTIONS: { id: HomeSortId; label: string; hint: string }[] =
  [
    { id: 'relevance', label: 'Relevance', hint: 'Best match for you' },
    { id: 'nearest', label: 'Distance: Near first', hint: 'Closest restaurants' },
    { id: 'rating', label: 'Rating: High to Low', hint: 'Top rated first' },
    { id: 'fastest', label: 'Delivery Time', hint: 'Fastest first' },
    { id: 'cost_low', label: 'Cost: Low to High', hint: 'Budget friendly' },
  ];

export const DISH_PRICE_OPTIONS: {
  id: DishPriceBand;
  label: string;
  rupees: number;
}[] = [
  { id: 'under_200', label: 'Under ₹200', rupees: 1 },
  { id: '200_350', label: '₹200 - ₹350', rupees: 2 },
  { id: 'above_350', label: 'Above ₹350', rupees: 3 },
];

export const TIME_OPTIONS: { id: DeliveryTimeBand; label: string }[] = [
  { id: 'under_20', label: 'Under 20 mins' },
  { id: 'under_30', label: 'Under 30 mins' },
  { id: 'under_45', label: 'Under 45 mins' },
];

export const RATING_OPTIONS: { id: RatingBand; label: string }[] = [
  { id: '4.5', label: 'Rated 4.5+' },
  { id: '4.0', label: 'Rated 4.0+' },
  { id: '3.5', label: 'Rated 3.5+' },
];

const CUISINE_KEYWORDS: Record<string, string[]> = {
  popular: [],
  fast_food: ['fast', 'burger', 'fried', 'sandwich', 'wrap', 'shawarma', 'rolls'],
  pizza: ['pizza', 'pizz'],
  biryani: ['biryani', 'biriyani', 'dum'],
  chinese: ['chinese', 'noodles', 'momos', 'manchurian', 'hakka'],
  burger: ['burger', 'burgers'],
  desserts: ['dessert', 'cake', 'sweet', 'ice cream', 'bakery', 'pastry', 'waffle'],
  dessert: ['dessert', 'cake', 'sweet', 'ice cream', 'bakery', 'pastry', 'waffle'],
  south_indian: ['south', 'dosa', 'idli', 'uttapam', 'vada', 'sambar'],
};

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function restaurantText(r: Restaurant): string {
  return `${r.name} ${(r.cuisines ?? []).join(' ')} ${r.description ?? ''} ${r.offer ?? ''}`.toLowerCase();
}

/** Live rating only — no invented scores for filters. */
export function effectiveRating(r: Restaurant): number {
  const live = r.avgRating ?? r.rating;
  if (typeof live === 'number' && Number.isFinite(live) && live > 0) {
    return live;
  }
  return 0;
}

/** Live cost-for-two only — no invented prices for filters. */
export function effectiveCost(r: Restaurant): number {
  const raw = Number(r.costForTwo || r.priceForTwo || 0);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return 0;
}

export function parseDeliveryMinutes(value?: string | null): number {
  if (!value) return 0;
  const nums = String(value).match(/\d+/g);
  if (!nums?.length) return 0;
  return Number(nums[0]) || 0;
}

/** Real promise / label ETA only — no hash fake for Near/Fast filters. */
export function effectiveDeliveryMinutes(r: Restaurant): number {
  if (typeof r.promiseMinutes === 'number' && r.promiseMinutes > 0) {
    return Math.round(r.promiseMinutes);
  }
  return parseDeliveryMinutes(r.deliveryTimeLabel || r.deliveryTime);
}

/** API distance only — no invented km for Near filter. */
export function effectiveDistanceKm(r: Restaurant): number {
  if (typeof r.distance === 'number' && Number.isFinite(r.distance) && r.distance > 0) {
    return r.distance;
  }
  if (
    typeof r.distanceMeters === 'number' &&
    Number.isFinite(r.distanceMeters) &&
    r.distanceMeters > 0
  ) {
    return Math.round((r.distanceMeters / 1000) * 10) / 10;
  }
  return 0;
}

export function restaurantCost(r: Restaurant): number {
  return effectiveCost(r);
}

export function hasActiveOffer(r: Restaurant): boolean {
  if (r.offer && String(r.offer).trim()) return true;
  if (Array.isArray(r.offerBadges) && r.offerBadges.length > 0) return true;
  const hay = restaurantText(r);
  return /(offer|% off|discount|deal|promo|flat)/i.test(hay);
}

export function isPureVegRestaurant(r: Restaurant): boolean {
  if (r.isPureVeg === true) return true;
  if (r.isPureVeg === false) return false;
  const hay = restaurantText(r);
  if (/(pure\s*veg|vegetarian only|veg only|jain)/i.test(hay)) return true;
  return false;
}

/** Only true when the restaurant document exposes the flag — no hash stub. */
export function hasNoPackagingCharge(r: Restaurant): boolean {
  const settings = r.settings as Record<string, unknown> | undefined;
  if (typeof settings?.noPackagingCharge === 'boolean') {
    return settings.noPackagingCharge;
  }
  if (typeof (r as { noPackagingCharge?: boolean }).noPackagingCharge === 'boolean') {
    return Boolean((r as { noPackagingCharge?: boolean }).noPackagingCharge);
  }
  return false;
}

/** Only true when the restaurant document exposes the flag — no hash stub. */
export function hasLowPlasticPackaging(r: Restaurant): boolean {
  const settings = r.settings as Record<string, unknown> | undefined;
  if (typeof settings?.lowPlastic === 'boolean') return settings.lowPlastic;
  if (typeof (r as { lowPlastic?: boolean }).lowPlastic === 'boolean') {
    return Boolean((r as { lowPlastic?: boolean }).lowPlastic);
  }
  return false;
}

export function matchesCuisine(r: Restaurant, cuisine: HomeCuisineId): boolean {
  if (!cuisine || cuisine === 'popular') return true;

  const keys = CUISINE_KEYWORDS[cuisine];
  if (keys?.length) {
    const hay = restaurantText(r);
    if (keys.some((k) => hay.includes(k))) return true;
  }

  return restaurantMatchesCategory(r, cuisine);
}

function minRatingForBand(band: RatingBand): number {
  if (band === '4.5') return 4.5;
  if (band === '4.0') return 4;
  if (band === '3.5') return 3.5;
  return 0;
}

function maxMinutesForBand(band: DeliveryTimeBand): number {
  if (band === 'under_20') return 20;
  if (band === 'under_30') return 30;
  if (band === 'under_45') return 45;
  return 999;
}

function matchesPriceBand(r: Restaurant, band: DishPriceBand): boolean {
  if (band === 'any') return true;
  const cost = effectiveCost(r);
  if (cost <= 0) return false;
  if (band === 'under_200') return cost < 200;
  if (band === '200_350') return cost >= 200 && cost <= 350;
  return cost > 350;
}

export function countActiveHomeFilters(filters: HomeFilterState): number {
  let n = 0;
  if (filters.cuisine !== 'popular') n += 1;
  if (filters.sort !== 'relevance' && !(filters.nearOnly && filters.sort === 'nearest')) {
    n += 1;
  }
  if (filters.nearOnly) n += 1;
  if (filters.ratingBand !== 'any') n += 1;
  if (filters.timeBand !== 'any') n += 1;
  if (filters.priceBand !== 'any') n += 1;
  if (filters.offersOnly) n += 1;
  if (filters.pureVeg) n += 1;
  if (filters.hygieneRatedOnly) n += 1;
  return n;
}

export function applyHomeFilters(
  rows: Restaurant[],
  filters: HomeFilterState,
  options?: { skipServerSide?: boolean }
): Restaurant[] {
  const skipServer = Boolean(options?.skipServerSide);
  // When nearby already applied `cuisines`, skip client cuisine re-filter.
  let list = skipServer
    ? [...rows]
    : rows.filter((r) => matchesCuisine(r, filters.cuisine));

  if (!skipServer && filters.pureVeg) {
    list = list.filter((r) => isPureVegRestaurant(r));
  }

  const ratingFloor = minRatingForBand(filters.ratingBand);
  if (!skipServer && ratingFloor > 0) {
    list = list.filter((r) => effectiveRating(r) >= ratingFloor);
  }

  const maxMins = maxMinutesForBand(filters.timeBand);
  if (maxMins < 999) {
    list = list.filter((r) => {
      const mins = effectiveDeliveryMinutes(r);
      return mins > 0 && mins <= maxMins;
    });
  }

  if (!skipServer && filters.priceBand !== 'any') {
    list = list.filter((r) => matchesPriceBand(r, filters.priceBand));
  }

  if (!skipServer && filters.offersOnly) {
    list = list.filter((r) => hasActiveOffer(r));
  }

  // Packaging / plastic stubs removed from UI — ignore leftover persisted flags.

  if (filters.hygieneRatedOnly && !skipServer) {
    list = list.filter(
      (r) => typeof r.hygieneScore === 'number' && r.hygieneScore >= 4
    );
  }

  if (filters.nearOnly) {
    list = list.filter((r) => {
      const km = effectiveDistanceKm(r);
      return km > 0 && km <= 4;
    });
  }

  list = [...list];

  const sortMode =
    filters.nearOnly && filters.sort === 'relevance'
      ? 'nearest'
      : filters.sort;

  if (skipServer && sortMode !== 'nearest' && sortMode !== 'fastest' && sortMode !== 'cost_high') {
    return list;
  }

  switch (sortMode) {
    case 'nearest':
      list.sort((a, b) => {
        const da = effectiveDistanceKm(a);
        const db = effectiveDistanceKm(b);
        if (da <= 0 && db <= 0) return 0;
        if (da <= 0) return 1;
        if (db <= 0) return -1;
        return da - db;
      });
      break;
    case 'rating':
      list.sort((a, b) => effectiveRating(b) - effectiveRating(a));
      break;
    case 'fastest':
      list.sort((a, b) => {
        const ta = effectiveDeliveryMinutes(a);
        const tb = effectiveDeliveryMinutes(b);
        if (ta <= 0 && tb <= 0) return 0;
        if (ta <= 0) return 1;
        if (tb <= 0) return -1;
        return ta - tb;
      });
      break;
    case 'cost_low':
      list.sort((a, b) => {
        const ca = effectiveCost(a);
        const cb = effectiveCost(b);
        if (ca <= 0 && cb <= 0) return 0;
        if (ca <= 0) return 1;
        if (cb <= 0) return -1;
        return ca - cb;
      });
      break;
    case 'cost_high':
      list.sort((a, b) => effectiveCost(b) - effectiveCost(a));
      break;
    case 'relevance':
    default:
      list.sort((a, b) => {
        const score = (r: Restaurant) =>
          effectiveRating(r) * 10 +
          Math.min(r.reviewCount ?? 0, 200) / 20 -
          (effectiveDeliveryMinutes(r) || 40) / 50 -
          (effectiveDistanceKm(r) || 3);
        return score(b) - score(a);
      });
      break;
  }

  return list;
}
