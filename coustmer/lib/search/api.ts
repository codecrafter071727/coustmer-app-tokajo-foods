import axios from 'axios';

import { api } from '@/lib/api';
import { FOOD_CATEGORIES } from '@/lib/restaurant/categories';
import { restaurantApi } from '@/lib/restaurant/api';
import { resolveIsOpen } from '@/lib/restaurant/mappers';
import { firstImageFromList, resolveMediaUrl } from '@/lib/restaurant/media';
import type { Restaurant } from '@/lib/restaurant/types';
import type {
  PaginationMeta,
  SearchCombinedParams,
  SearchCombinedResult,
  SearchDish,
  SearchDishesParams,
  SearchDishesResult,
  SearchRestaurant,
  SearchRestaurantsParams,
  SearchRestaurantsResult,
  SearchSuggestion,
  SearchSuggestionsParams,
  SearchSuggestionsResult,
} from '@/lib/search/types';

const SEARCH_SERVICE = '/api/v1/search-service';

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  service?: string;
};

/** In-memory restaurant catalog for instant Swiggy-style prefix matching. */
let catalogCache: { at: number; restaurants: SearchRestaurant[] } | null = null;
const CATALOG_TTL_MS = 90_000;

type MenuCategoryIndex = {
  id: string;
  name: string;
};

type RestaurantMenuIndex = {
  restaurant: SearchRestaurant;
  categories: MenuCategoryIndex[];
  dishes: SearchDish[];
};

/** Real menu evidence per restaurant (categories + dishes from API). */
let menuIndexCache: { at: number; entries: RestaurantMenuIndex[] } | null =
  null;
const MENU_INDEX_TTL_MS = 90_000;
const MENU_SCAN_RESTAURANT_LIMIT = 50;

async function request<T>(path: string): Promise<Envelope<T>> {
  try {
    const response = await api.get<Envelope<T> | T>(path, {
      withCredentials: true,
      headers: { Accept: 'application/json' },
      // Don't hang the UI when search-service circuit is open.
      timeout: 8_000,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status >= 400) {
      const data = response.data as { message?: string; error?: string } | undefined;
      throw new Error(
        data?.message || data?.error || `Request failed (${response.status})`
      );
    }

    const payload = response.data as Envelope<T> | T;
    if (
      payload &&
      typeof payload === 'object' &&
      ('data' in (payload as object) ||
        'success' in (payload as object) ||
        'service' in (payload as object))
    ) {
      const envelope = payload as Envelope<T>;
      if (envelope.success === false) {
        throw new Error(envelope.message || 'Search service unavailable');
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
      throw new Error(
        data?.message ||
          data?.error ||
          `Request failed (${error.response.status})`
      );
    }

    throw error;
  }
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function extractList(
  data: unknown,
  keys: string[]
): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (!data || typeof data !== 'object') return [];

  const record = data as Record<string, unknown>;
  for (const key of keys) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  }

  if (Array.isArray(record.data)) {
    return record.data as Record<string, unknown>[];
  }

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
  if (
    total === undefined &&
    page === undefined &&
    limit === undefined &&
    totalPages === undefined
  ) {
    return undefined;
  }
  return { total, page, limit, totalPages };
}

function restaurantToSearch(r: Restaurant): SearchRestaurant {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    imageUrl: r.imageUrl,
    coverUrl: r.coverUrl,
    rating: r.rating,
    reviewCount: r.reviewCount,
    cuisines: r.cuisines,
    deliveryTime: r.deliveryTime,
    priceForTwo: r.priceForTwo ?? r.costForTwo,
    distance: r.distance,
    isOpen: r.isOpen,
    address: r.address,
    city: r.city,
    offer: r.offer,
    isPureVeg: r.isPureVeg,
    lat: r.lat,
    lng: r.lng,
  };
}

export function mapSearchRestaurant(
  raw: Record<string, unknown>
): SearchRestaurant {
  const addressRaw = raw.address;
  let address: string | undefined;
  let cityFromAddress: string | undefined;
  if (typeof addressRaw === 'string') {
    address = addressRaw;
  } else if (addressRaw && typeof addressRaw === 'object') {
    const a = addressRaw as Record<string, unknown>;
    cityFromAddress = a.city ? String(a.city) : undefined;
    address = [a.street, a.area, a.city, a.state, a.pincode]
      .filter(Boolean)
      .map(String)
      .join(', ');
  }

  const location = raw.location as { coordinates?: number[] } | undefined;
  const coords = location?.coordinates;
  const fromImages = firstImageFromList(raw.images);
  const cuisinesRaw = raw.cuisines ?? raw.cuisineTypes ?? raw.tags;
  const cuisines = Array.isArray(cuisinesRaw)
    ? (cuisinesRaw as unknown[]).map(String).filter(Boolean)
    : undefined;

  const imageUrl =
    resolveMediaUrl(
      (raw.imageUrl as string) ||
        (raw.logoUrl as string) ||
        (raw.coverUrl as string) ||
        fromImages
    ) || undefined;

  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? raw.title ?? 'Restaurant'),
    description: (raw.description as string) || undefined,
    imageUrl,
    coverUrl:
      resolveMediaUrl(
        (raw.coverUrl as string) || (raw.bannerUrl as string) || fromImages
      ) || undefined,
    rating:
      typeof raw.rating === 'number'
        ? raw.rating
        : typeof raw.avgRating === 'number'
          ? raw.avgRating
          : Number(raw.rating) || undefined,
    reviewCount:
      typeof raw.reviewCount === 'number'
        ? raw.reviewCount
        : typeof raw.totalRatings === 'number'
          ? raw.totalRatings
          : undefined,
    cuisines,
    deliveryTime:
      (raw.deliveryTime as string) ||
      (raw.eta as string) ||
      (typeof raw.avgPrepTime === 'number' ? `${raw.avgPrepTime} mins` : undefined),
    priceForTwo:
      typeof raw.priceForTwo === 'number'
        ? raw.priceForTwo
        : typeof raw.costForTwo === 'number'
          ? raw.costForTwo
          : undefined,
    distance:
      typeof raw.distance === 'number'
        ? raw.distance
        : typeof raw.distanceKm === 'number'
          ? raw.distanceKm
          : undefined,
    isOpen: resolveIsOpen(raw),
    address,
    city: (raw.city as string) || cityFromAddress,
    offer: (raw.offer as string) || (raw.promoText as string) || undefined,
    isPureVeg:
      raw.isPureVeg !== undefined
        ? Boolean(raw.isPureVeg)
        : asRecord(raw.settings).isPureVeg !== undefined
          ? Boolean(asRecord(raw.settings).isPureVeg)
          : undefined,
    lat:
      typeof raw.lat === 'number'
        ? raw.lat
        : Array.isArray(coords) && typeof coords[1] === 'number'
          ? coords[1]
          : undefined,
    lng:
      typeof raw.lng === 'number'
        ? raw.lng
        : Array.isArray(coords) && typeof coords[0] === 'number'
          ? coords[0]
          : undefined,
  };
}

export function mapSearchDish(raw: Record<string, unknown>): SearchDish {
  const restaurant =
    raw.restaurant && typeof raw.restaurant === 'object'
      ? (raw.restaurant as Record<string, unknown>)
      : undefined;

  const categoryObj =
    raw.category && typeof raw.category === 'object'
      ? (raw.category as Record<string, unknown>)
      : undefined;

  const imageFromList = firstImageFromList(raw.images);
  const restaurantId = String(
    raw.restaurantId ??
      raw.restaurant_id ??
      restaurant?._id ??
      restaurant?.id ??
      ''
  );

  return {
    id: String(raw._id ?? raw.id ?? raw.itemId ?? ''),
    name: String(raw.name ?? raw.title ?? 'Dish'),
    description: (raw.description as string) || undefined,
    price: Number(raw.price ?? raw.basePrice ?? 0),
    imageUrl:
      resolveMediaUrl(
        (raw.imageUrl as string) || (raw.image as string) || imageFromList
      ) || undefined,
    isVeg:
      raw.isVeg !== undefined
        ? Boolean(raw.isVeg)
        : raw.veg !== undefined
          ? Boolean(raw.veg)
          : raw.isVegetarian !== undefined
            ? Boolean(raw.isVegetarian)
            : undefined,
    isAvailable:
      raw.isAvailable !== undefined
        ? Boolean(raw.isAvailable)
        : raw.available !== undefined
          ? Boolean(raw.available)
          : undefined,
    rating:
      typeof raw.rating === 'number'
        ? raw.rating
        : typeof raw.avgRating === 'number'
          ? raw.avgRating
          : undefined,
    restaurantId,
    restaurantName:
      (raw.restaurantName as string) ||
      (restaurant?.name as string) ||
      undefined,
    categoryName:
      (raw.categoryName as string) ||
      (categoryObj?.name as string) ||
      (typeof raw.category === 'string' ? raw.category : undefined) ||
      undefined,
    categoryId: raw.categoryId
      ? String(raw.categoryId)
      : categoryObj?._id
        ? String(categoryObj._id)
        : categoryObj?.id
          ? String(categoryObj.id)
          : undefined,
  };
}

export function mapSearchSuggestion(
  raw: unknown,
  index: number
): SearchSuggestion {
  if (typeof raw === 'string') {
    return {
      id: `s-${index}-${raw}`,
      text: raw,
      type: 'query',
    };
  }

  const row = asRecord(raw);
  const text = String(
    row.text ?? row.suggestion ?? row.query ?? row.name ?? row.label ?? ''
  ).trim();

  return {
    id: String(row._id ?? row.id ?? `s-${index}-${text}`),
    text,
    type: (row.type as string) || (row.kind as string) || 'query',
    restaurantId: row.restaurantId
      ? String(row.restaurantId)
      : row.restaurant
        ? String(row.restaurant)
        : undefined,
    dishId: row.dishId
      ? String(row.dishId)
      : row.itemId
        ? String(row.itemId)
        : undefined,
    imageUrl: resolveMediaUrl(
      (row.imageUrl as string) || (row.image as string) || undefined
    ),
  };
}

/** Map free-text like "burger" / "Biryani" → cuisine slug used by restaurant API. */
function resolveCuisineFromQuery(q: string): string | undefined {
  const needle = q.trim().toLowerCase();
  if (!needle) return undefined;

  const exact = FOOD_CATEGORIES.find((c) => {
    if (c.slug === 'all') return false;
    const label = c.label.toLowerCase();
    const slug = c.slug.toLowerCase();
    const slugWords = slug.replace(/-/g, ' ');
    return (
      label === needle ||
      slug === needle ||
      slugWords === needle ||
      label.includes(needle) ||
      needle.includes(slugWords) ||
      needle.includes(label)
    );
  });
  if (exact) return exact.slug;

  // Common dish aliases → category (short prefixes for live typing, e.g. "piz")
  if (/burg|fries|wing/.test(needle)) return 'burger';
  if (/piz|margherita|pepperoni/.test(needle)) return 'pizza';
  if (/biry|dum|hyderabadi/.test(needle)) return 'biryani';
  if (/momos?|manchurian|hakka|noodle|fried rice/.test(needle)) return 'chinese';
  if (/dosa|idli|uttapam|sambar/.test(needle)) return 'south-indian';
  if (/paneer|butter chicken|dal|naan|tandoor/.test(needle)) return 'north-indian';
  if (/cake|brownie|pastr|dessert|ice cream|icecream/.test(needle)) return 'dessert';
  if (/chai|coffee|shake|juice|lassi/.test(needle)) return 'beverages';
  if (/sandw/.test(needle)) return 'sandwich';
  if (/past/.test(needle)) return 'pasta';
  if (/thal/.test(needle)) return 'thali';
  if (/roll/.test(needle)) return 'rolls';
  if (/sweet|mithai|ladoo|gulab/.test(needle)) return 'sweets';

  return undefined;
}

function restaurantNameMatches(restaurant: SearchRestaurant, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  return (
    restaurant.name.toLowerCase().includes(needle) ||
    restaurant.city?.toLowerCase().includes(needle) === true ||
    restaurant.address?.toLowerCase().includes(needle) === true
  );
}

function categoryMatchesQuery(categoryName: string, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle || !categoryName) return false;
  const name = categoryName.toLowerCase();
  if (name.includes(needle) || needle.includes(name)) return true;

  const cuisineSlug = resolveCuisineFromQuery(needle);
  if (!cuisineSlug) return false;
  const food = FOOD_CATEGORIES.find((c) => c.slug === cuisineSlug);
  if (!food) return false;
  const label = food.label.toLowerCase();
  const slugWords = food.slug.replace(/-/g, ' ');
  return (
    name.includes(label) ||
    name.includes(slugWords) ||
    label.includes(name) ||
    slugWords.includes(name)
  );
}

function dishMatchesQuery(
  name: string,
  q: string,
  extras?: { categoryName?: string; description?: string; tags?: string[] }
) {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  if (name.toLowerCase().includes(needle)) return true;
  if (extras?.description?.toLowerCase().includes(needle)) return true;
  if (extras?.tags?.some((t) => t.toLowerCase().includes(needle))) return true;
  // Category on the dish counts as category evidence for that item.
  if (
    extras?.categoryName &&
    categoryMatchesQuery(extras.categoryName, needle)
  ) {
    return true;
  }
  // "piz" → pizza cuisine → match dishes whose name contains "pizza"
  const cuisineSlug = resolveCuisineFromQuery(needle);
  if (cuisineSlug) {
    const food = FOOD_CATEGORIES.find((c) => c.slug === cuisineSlug);
    if (food) {
      const label = food.label.toLowerCase();
      const slugWords = food.slug.replace(/-/g, ' ');
      const dishName = name.toLowerCase();
      if (dishName.includes(label) || dishName.includes(slugWords)) return true;
    }
  }
  return false;
}

function rankRestaurants(restaurants: SearchRestaurant[], q: string) {
  const needle = q.trim().toLowerCase();
  return [...restaurants].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aStarts = aName.startsWith(needle) ? 0 : 1;
    const bStarts = bName.startsWith(needle) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    const aIndex = aName.indexOf(needle);
    const bIndex = bName.indexOf(needle);
    if (aIndex !== bIndex) return aIndex - bIndex;
    return aName.localeCompare(bName);
  });
}

function mergeRestaurants(...lists: SearchRestaurant[][]) {
  const map = new Map<string, SearchRestaurant>();
  for (const list of lists) {
    for (const item of list) {
      if (!item.id) continue;
      if (!map.has(item.id)) map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

async function loadRestaurantCatalog(): Promise<SearchRestaurant[]> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CATALOG_TTL_MS) {
    return catalogCache.restaurants;
  }

  const { restaurants } = await restaurantApi.getAllRestaurants({
    limit: 50,
    sort: '-createdAt',
  });
  const mapped = restaurants.map(restaurantToSearch);
  catalogCache = { at: now, restaurants: mapped };
  return mapped;
}

/**
 * Build evidence index: for each restaurant, load REAL categories + dishes.
 * Search then answers: "does this restaurant actually have this category/dish?"
 */
async function loadMenuIndex(): Promise<RestaurantMenuIndex[]> {
  const now = Date.now();
  if (menuIndexCache && now - menuIndexCache.at < MENU_INDEX_TTL_MS) {
    return menuIndexCache.entries;
  }

  const restaurants = await loadRestaurantCatalog();
  const targets = restaurants.slice(0, MENU_SCAN_RESTAURANT_LIMIT);

  const entries = await Promise.all(
    targets.map(async (restaurant): Promise<RestaurantMenuIndex> => {
      const [categoriesResult, itemsResult] = await Promise.all([
        restaurantApi.getCategories(restaurant.id).catch(() => []),
        restaurantApi.getItems(restaurant.id).catch(() => []),
      ]);

      const categories: MenuCategoryIndex[] = (categoriesResult ?? [])
        .filter((c) => c.name)
        .map((c) => ({ id: c.id, name: c.name }));

      // If categories endpoint is empty, derive from item category names.
      if (categories.length === 0) {
        const seen = new Map<string, string>();
        for (const item of itemsResult) {
          const catName = item.categoryName?.trim();
          if (!catName) continue;
          const catId = item.categoryId || catName;
          if (!seen.has(catId)) seen.set(catId, catName);
        }
        for (const [id, name] of seen) {
          categories.push({ id, name });
        }
      }

      const dishes: SearchDish[] = (itemsResult ?? [])
        .filter((item) => item.name && item.name !== 'Item' && item.price > 0)
        .filter((item) => item.isAvailable !== false)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
          isVeg: item.isVeg,
          isAvailable: item.isAvailable,
          rating: item.rating,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
        }));

      return { restaurant, categories, dishes };
    })
  );

  menuIndexCache = { at: now, entries };
  return entries;
}

/**
 * Search using menu evidence only:
 * - dish present on restaurant menu, OR
 * - category present on restaurant menu, OR
 * - restaurant name match
 */
async function searchByMenuEvidence(
  q: string,
  limit = 30,
  vegOnly?: boolean
): Promise<{ restaurants: SearchRestaurant[]; dishes: SearchDish[] }> {
  const needle = q.trim();
  if (!needle) return { restaurants: [], dishes: [] };

  const index = await loadMenuIndex();
  const restaurantMap = new Map<string, SearchRestaurant>();
  const dishHits: SearchDish[] = [];

  for (const entry of index) {
    const nameHit = restaurantNameMatches(entry.restaurant, needle);

    const categoryHits = entry.categories.filter((c) =>
      categoryMatchesQuery(c.name, needle)
    );
    const hasCategory = categoryHits.length > 0;

    const matchingDishes = entry.dishes.filter((dish) => {
      if (vegOnly && dish.isVeg === false) return false;
      return dishMatchesQuery(dish.name, needle, {
        categoryName: dish.categoryName,
        description: dish.description,
      });
    });

    // Also include dishes that sit inside a matched category.
    if (hasCategory) {
      const categoryNames = new Set(
        categoryHits.map((c) => c.name.toLowerCase())
      );
      const categoryIds = new Set(categoryHits.map((c) => c.id));
      for (const dish of entry.dishes) {
        if (vegOnly && dish.isVeg === false) continue;
        const inCategory =
          (dish.categoryId && categoryIds.has(dish.categoryId)) ||
          (dish.categoryName &&
            categoryNames.has(dish.categoryName.toLowerCase()));
        if (!inCategory) continue;
        if (
          matchingDishes.some(
            (d) => d.id === dish.id && d.restaurantId === dish.restaurantId
          )
        ) {
          continue;
        }
        matchingDishes.push(dish);
      }
    }

    const hasDish = matchingDishes.length > 0;

    // Only surface the restaurant if it actually has the category/dish,
    // or the query is clearly the restaurant name.
    if (hasDish || hasCategory || nameHit) {
      restaurantMap.set(entry.restaurant.id, entry.restaurant);
      dishHits.push(...matchingDishes);
    }
  }

  return {
    restaurants: rankRestaurants(
      Array.from(restaurantMap.values()),
      needle
    ).slice(0, limit),
    dishes: mergeDishes(dishHits).slice(0, limit),
  };
}

function mergeDishes(...lists: SearchDish[][]) {
  const map = new Map<string, SearchDish>();
  for (const list of lists) {
    for (const item of list) {
      if (!item.id && !item.name) continue;
      const key = `${item.restaurantId}:${item.id || item.name.toLowerCase()}`;
      if (!map.has(key)) map.set(key, item);
    }
  }
  return Array.from(map.values());
}

async function restaurantServiceSearch(
  params: SearchRestaurantsParams
): Promise<SearchRestaurant[]> {
  const q = params.q?.trim();
  if (!q && !params.cuisine) return [];

  try {
    const { restaurants } = await restaurantApi.getRestaurants({
      search: q || undefined,
      cuisine: params.cuisine,
      page: params.page,
      limit: params.limit ?? 40,
      sort: params.sort ?? '-createdAt',
    });
    return restaurants.map(restaurantToSearch);
  } catch {
    return [];
  }
}

async function searchServiceDishes(
  params: SearchDishesParams
): Promise<SearchDish[]> {
  try {
    const res = await request<unknown>(
      `${SEARCH_SERVICE}/dishes${buildQuery({
        q: params.q,
        restaurantId: params.restaurantId,
        veg:
          params.veg === undefined ? undefined : params.veg ? 'true' : 'false',
        page: params.page,
        limit: params.limit ?? 20,
      })}`
    );
    return extractList(res.data, ['dishes', 'items', 'results', 'docs']).map(
      mapSearchDish
    );
  } catch {
    return [];
  }
}

async function searchServiceCombined(
  params: SearchCombinedParams
): Promise<SearchCombinedResult | null> {
  try {
    const res = await request<unknown>(
      `${SEARCH_SERVICE}/combined${buildQuery({
        q: params.q,
        cuisine: params.cuisine,
        veg:
          params.veg === undefined
            ? undefined
            : params.veg
              ? 'true'
              : 'false',
        page: params.page,
        limit: params.limit ?? 20,
      })}`
    );

    const data = asRecord(res.data);
    return {
      restaurants: extractList(res.data, [
        'restaurants',
        'restaurantResults',
      ]).map(mapSearchRestaurant),
      dishes: extractList(res.data, ['dishes', 'items', 'menuItems']).map(
        mapSearchDish
      ),
      query: (data.query as string) || params.q,
      meta: extractMeta(res.data, res.meta),
    };
  } catch {
    return null;
  }
}

export const searchApi = {
  /** GET /health */
  health: async (): Promise<{ ok: boolean; service?: string }> => {
    try {
      const res = await request<{ service?: string } | undefined>(
        `${SEARCH_SERVICE}/health`
      );
      return {
        ok: res.success !== false,
        service:
          res.service || (asRecord(res.data).service as string | undefined),
      };
    } catch {
      return { ok: false };
    }
  },

  /**
   * Restaurant search based on menu evidence:
   * only restaurants that have the category/dish (or name match).
   */
  searchRestaurants: async (
    params: SearchRestaurantsParams
  ): Promise<SearchRestaurantsResult> => {
    const q = params.q?.trim() ?? '';
    const limit = params.limit ?? 30;

    if (!q && params.cuisine) {
      // Cuisine-only: restaurants that actually have that menu category.
      const evidence = await searchByMenuEvidence(params.cuisine, limit);
      return {
        restaurants: evidence.restaurants,
        meta: { total: evidence.restaurants.length, page: 1, limit },
        query: params.cuisine,
      };
    }

    if (!q) {
      return { restaurants: [], meta: { total: 0 }, query: '' };
    }

    const [evidence, nameHits] = await Promise.all([
      searchByMenuEvidence(q, limit),
      restaurantServiceSearch({ ...params, q, limit }).catch(
        () => [] as SearchRestaurant[]
      ),
    ]);

    // Keep name-search hits only when they also appear in menu evidence,
    // OR when the restaurant name itself matches the query.
    const evidenceIds = new Set(evidence.restaurants.map((r) => r.id));
    const nameOnly = nameHits.filter(
      (r) => restaurantNameMatches(r, q) && !evidenceIds.has(r.id)
    );

    const restaurants = rankRestaurants(
      mergeRestaurants(evidence.restaurants, nameOnly),
      q
    ).slice(0, limit);

    return {
      restaurants,
      meta: { total: restaurants.length, page: 1, limit },
      query: q,
    };
  },

  /** Dishes that actually exist on restaurant menus. */
  searchDishes: async (
    params: SearchDishesParams
  ): Promise<SearchDishesResult> => {
    const q = params.q?.trim() ?? '';
    const limit = params.limit ?? 24;

    const [remote, evidence] = await Promise.all([
      searchServiceDishes(params),
      q
        ? searchByMenuEvidence(q, limit, params.veg)
        : Promise.resolve({
            restaurants: [] as SearchRestaurant[],
            dishes: [] as SearchDish[],
          }),
    ]);

    let dishes = mergeDishes(remote, evidence.dishes);
    if (params.veg) {
      dishes = dishes.filter((d) => d.isVeg !== false);
    }
    if (params.restaurantId) {
      dishes = dishes.filter((d) => d.restaurantId === params.restaurantId);
    }

    return {
      dishes: dishes.slice(0, limit),
      meta: { total: dishes.length },
      query: q,
    };
  },

  /**
   * Combined search: restaurants + dishes proven by menu category/dish presence.
   */
  searchCombined: async (
    params: SearchCombinedParams
  ): Promise<SearchCombinedResult> => {
    const q = params.q.trim();
    if (!q) {
      return { restaurants: [], dishes: [], query: '' };
    }

    const limit = params.limit ?? 24;

    const [remote, evidence] = await Promise.all([
      searchServiceCombined(params),
      searchByMenuEvidence(q, limit, params.veg),
    ]);

    // Remote search-service hits are kept only if we can verify them in menu
    // evidence, OR for restaurant name matches.
    const evidenceRestaurantIds = new Set(
      evidence.restaurants.map((r) => r.id)
    );
    const remoteRestaurants = (remote?.restaurants ?? []).filter(
      (r) =>
        evidenceRestaurantIds.has(r.id) || restaurantNameMatches(r, q)
    );

    let dishes = mergeDishes(remote?.dishes ?? [], evidence.dishes);
    if (params.veg) {
      dishes = dishes.filter((d) => d.isVeg !== false);
    }

    // Any restaurant that has a matching dish must appear in restaurant list.
    for (const dish of dishes) {
      if (!dish.restaurantId || evidenceRestaurantIds.has(dish.restaurantId)) {
        continue;
      }
      const fromRemote = (remote?.restaurants ?? []).find(
        (r) => r.id === dish.restaurantId
      );
      if (fromRemote) {
        evidence.restaurants.push(fromRemote);
        evidenceRestaurantIds.add(fromRemote.id);
      }
    }

    const restaurants = rankRestaurants(
      mergeRestaurants(evidence.restaurants, remoteRestaurants),
      q
    ).slice(0, limit);

    return {
      restaurants,
      dishes: dishes.slice(0, limit),
      query: remote?.query || q,
      meta: {
        total: restaurants.length + dishes.length,
      },
    };
  },

  /**
   * Suggestions from real menu categories + dishes + restaurant names.
   */
  getSuggestions: async (
    params: SearchSuggestionsParams
  ): Promise<SearchSuggestionsResult> => {
    const q = params.q.trim();
    if (!q) return { suggestions: [], query: '' };

    const limit = params.limit ?? 10;

    const remotePromise = (async (): Promise<SearchSuggestion[]> => {
      try {
        const res = await request<unknown>(
          `${SEARCH_SERVICE}/suggestions${buildQuery({ q, limit })}`
        );
        return extractList(res.data, [
          'suggestions',
          'results',
          'items',
          'data',
        ])
          .map(mapSearchSuggestion)
          .filter((s) => s.text.length > 0);
      } catch {
        return [];
      }
    })();

    const [remote, evidence, index] = await Promise.all([
      remotePromise,
      searchByMenuEvidence(q, 8),
      loadMenuIndex(),
    ]);

    const categorySuggestions: SearchSuggestion[] = [];
    const seenCategories = new Set<string>();
    for (const entry of index) {
      for (const cat of entry.categories) {
        if (!categoryMatchesQuery(cat.name, q)) continue;
        const key = cat.name.toLowerCase();
        if (seenCategories.has(key)) continue;
        seenCategories.add(key);
        categorySuggestions.push({
          id: `cat-${key}`,
          text: cat.name,
          type: 'cuisine',
        });
      }
    }

    const localSuggestions: SearchSuggestion[] = [
      ...evidence.dishes.slice(0, 5).map((d) => ({
        id: `dish-${d.restaurantId}-${d.id}`,
        text: d.name,
        type: 'dish' as const,
        restaurantId: d.restaurantId,
        dishId: d.id,
        imageUrl: d.imageUrl,
      })),
      ...categorySuggestions.slice(0, 3),
      ...evidence.restaurants.slice(0, 4).map((r) => ({
        id: `rest-${r.id}`,
        text: r.name,
        type: 'restaurant' as const,
        restaurantId: r.id,
        imageUrl: r.imageUrl || r.coverUrl,
      })),
    ];

    const seen = new Set<string>();
    const suggestions: SearchSuggestion[] = [];
    for (const item of [...localSuggestions, ...remote]) {
      const key = `${item.type}:${item.text.toLowerCase()}:${item.restaurantId ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(item);
      if (suggestions.length >= limit) break;
    }

    return { suggestions, query: q };
  },

  /** Warm restaurant + menu evidence catalogs on search screen mount. */
  prefetchCatalog: async (): Promise<{
    restaurants: number;
    dishes: number;
    categories: number;
  }> => {
    const [restaurants, index] = await Promise.all([
      loadRestaurantCatalog(),
      loadMenuIndex(),
    ]);
    return {
      restaurants: restaurants.length,
      dishes: index.reduce((sum, e) => sum + e.dishes.length, 0),
      categories: index.reduce((sum, e) => sum + e.categories.length, 0),
    };
  },
};
