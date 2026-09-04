import { restaurantApi } from '@/lib/restaurant/api';
import { queryClient } from '@/lib/query-client';
import { CUSTOMER_DISCOVERY_RADIUS_KM } from '@/lib/location/discovery-radius';
import {
  menuCategoryMatchesCuisine,
  menuItemMatchesCategory,
  restaurantMatchesCategory,
} from '@/lib/restaurant/categories';
import { enrichMenuItems } from '@/lib/restaurant/mappers';
import { buildHomeCategories } from '@/lib/restaurant/home-categories';
import { buildSeedMenu, findSeedMenuItem } from '@/lib/restaurant/seed-menu';
import type {
  CuisineChip,
  MenuItem,
  MenuItemListParams,
  NearbyParams,
  Restaurant,
  RestaurantListParams,
} from '@/lib/restaurant/types';
import type { HomeCategory } from '@/lib/home/types';
import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';

export type SeedMenuOptions = {
  name?: string;
  cuisines?: string[];
};

export const restaurantKeys = {
  all: ['restaurant'] as const,
  list: (params: RestaurantListParams) =>
    [...restaurantKeys.all, 'list', params] as const,
  infinite: (params: Omit<RestaurantListParams, 'page' | 'fetchAll'>) =>
    [...restaurantKeys.all, 'infinite', params] as const,
  nearby: (params: NearbyParams) =>
    [...restaurantKeys.all, 'nearby', params] as const,
  cuisines: () => [...restaurantKeys.all, 'cuisines'] as const,
  mindCategories: (params: {
    lat: number;
    lng: number;
    radius?: number;
    limit?: number;
  }) => [...restaurantKeys.all, 'mind-categories', params] as const,
  detail: (id: string) => [...restaurantKeys.all, 'detail', id] as const,
  slug: (slug: string) => [...restaurantKeys.all, 'slug', slug] as const,
  timings: (id: string) => [...restaurantKeys.all, 'timings', id] as const,
  hygiene: (id: string) => [...restaurantKeys.all, 'hygiene', id] as const,
  ratings: (id: string) => [...restaurantKeys.all, 'ratings', id] as const,
  unavailable: (id: string) =>
    [...restaurantKeys.all, 'unavailable', id] as const,
  customizations: (restaurantId: string, itemId: string) =>
    [...restaurantKeys.all, 'customizations', restaurantId, itemId] as const,
  recommendedItems: (id: string) =>
    [...restaurantKeys.all, 'recommended-items', id] as const,
  alerts: () => [...restaurantKeys.all, 'alerts'] as const,
  menu: (id: string) => [...restaurantKeys.all, 'menu', id] as const,
  categories: (id: string) => [...restaurantKeys.all, 'categories', id] as const,
  items: (id: string, filters?: Record<string, unknown>) =>
    [...restaurantKeys.all, 'items', id, filters ?? {}] as const,
  itemsPrefix: (id: string) => [...restaurantKeys.all, 'items', id] as const,
  item: (restaurantId: string, itemId: string) =>
    [...restaurantKeys.all, 'item', restaurantId, itemId] as const,
  offers: (id: string) => [...restaurantKeys.all, 'offers', id] as const,
  offer: (restaurantId: string, offerId: string) =>
    [...restaurantKeys.all, 'offer', restaurantId, offerId] as const,
};

export function useRestaurants(params: RestaurantListParams = {}) {
  const fetchAll = params.fetchAll !== false;

  return useQuery({
    queryKey: restaurantKeys.list({ ...params, fetchAll }),
    queryFn: () =>
      fetchAll
        ? restaurantApi.getAllRestaurants(params)
        : restaurantApi.getRestaurants(params),
    retry: 2,
    staleTime: 60_000,
  });
}

/** Paginated endless list — loads more as the user scrolls. */
export function useInfiniteRestaurants(
  params: Omit<RestaurantListParams, 'page' | 'fetchAll'> = {},
  options?: { enabled?: boolean }
) {
  const pageSize = params.limit ?? 12;

  return useInfiniteQuery({
    queryKey: restaurantKeys.infinite({ ...params, limit: pageSize }),
    queryFn: ({ pageParam }) =>
      restaurantApi.getRestaurants({
        ...params,
        page: pageParam,
        limit: pageSize,
        sort: params.sort ?? 'newest',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta?.hasNext) {
        return (lastPage.meta.page ?? 1) + 1;
      }
      if (
        lastPage.restaurants.length >= pageSize &&
        (lastPage.meta?.totalPages == null ||
          (lastPage.meta.page ?? 1) < (lastPage.meta.totalPages ?? 1))
      ) {
        return (lastPage.meta?.page ?? 1) + 1;
      }
      return undefined;
    },
    retry: 2,
    staleTime: 60_000,
    enabled: options?.enabled !== false,
  });
}

export function useNearbyRestaurants(params: NearbyParams | null) {
  return useQuery({
    queryKey: restaurantKeys.nearby(params ?? { lat: 0, lng: 0 }),
    queryFn: () =>
      restaurantApi.getNearby({
        ...params!,
        limit: params?.limit ?? 50,
        radius: params?.radius ?? CUSTOMER_DISCOVERY_RADIUS_KM,
      }),
    enabled: Boolean(params?.lat && params?.lng),
    retry: 2,
    staleTime: 60_000,
  });
}

/**
 * Restaurants that offer a cuisine/category.
 * Uses list API (?cuisine=&city=) then confirms via GET .../categories when available.
 */
export function useRestaurantsOfferingCategory(input: {
  cuisine: string;
  city?: string | null;
  enabled?: boolean;
}) {
  const cuisine = input.cuisine.trim();
  const city = input.city?.trim() || undefined;

  return useQuery({
    queryKey: [
      ...restaurantKeys.all,
      'offering-category',
      cuisine,
      city ?? '',
    ],
    queryFn: async (): Promise<{ restaurants: Restaurant[]; total: number }> => {
      const { restaurants: listed, meta } = await restaurantApi.getRestaurants({
        cuisine,
        city,
        sort: 'newest',
        limit: 50,
        page: 1,
      });

      // Cuisine-filtered list from API; broaden with city matches when sparse.
      const listedIds = new Set(listed.map((r) => r.id));
      let candidates = [...listed];
      if (candidates.length < 8 && city) {
        const broader = await restaurantApi.getRestaurants({
          city,
          sort: 'newest',
          limit: 50,
          page: 1,
        });
        const merged = new Map<string, Restaurant>();
        for (const r of listed) merged.set(r.id, r);
        for (const r of broader.restaurants) {
          if (listedIds.has(r.id) || restaurantMatchesCategory(r, cuisine)) {
            merged.set(r.id, r);
          }
        }
        candidates = [...merged.values()];
      }

      if (candidates.length === 0) {
        return { restaurants: [], total: 0 };
      }

      const matched: Restaurant[] = [];
      const chunkSize = 8;

      for (let i = 0; i < candidates.length; i += chunkSize) {
        const chunk = candidates.slice(i, i + chunkSize);
        const rows = await Promise.all(
          chunk.map(async (restaurant) => {
            try {
              const cats = await restaurantApi.getCategories(restaurant.id);
              if (cats.length === 0) {
                return restaurantMatchesCategory(restaurant, cuisine)
                  ? restaurant
                  : null;
              }
              const hasMenuCategory = cats.some((c) =>
                menuCategoryMatchesCuisine(c, cuisine)
              );
              if (hasMenuCategory) return restaurant;
              // Menu categories exist but don't match — keep cuisine-tagged partners
              return restaurantMatchesCategory(restaurant, cuisine)
                ? restaurant
                : null;
            } catch {
              return restaurantMatchesCategory(restaurant, cuisine)
                ? restaurant
                : null;
            }
          })
        );
        for (const row of rows) {
          if (row) matched.push(row);
        }
      }

      return {
        restaurants: matched,
        total: meta?.total && matched.length >= listed.length
          ? Math.max(meta.total, matched.length)
          : matched.length,
      };
    },
    enabled: input.enabled !== false && Boolean(cuisine) && cuisine !== 'all',
    staleTime: 60_000,
    retry: 1,
  });
}

export type CategoryDish = {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
  isBestSeller?: boolean;
  categoryName?: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImageUrl?: string;
  deliveryTime?: string;
  rating?: number;
};

/**
 * Menu items across nearby restaurants for a mind / category chip.
 * Prefers GET /restaurants/nearby/dishes when lat/lng are set.
 */
export function useCategoryDishes(input: {
  cuisine: string;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  enabled?: boolean;
  restaurantLimit?: number;
}) {
  const cuisine = input.cuisine.trim();
  const city = input.city?.trim() || undefined;
  const lat = input.lat;
  const lng = input.lng;
  const restaurantLimit = input.restaurantLimit ?? 40;
  const hasPin =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  return useQuery({
    queryKey: [
      ...restaurantKeys.all,
      'category-dishes',
      'v2-nearby',
      cuisine,
      hasPin ? `${lat},${lng}` : city ?? '',
      restaurantLimit,
    ],
    queryFn: async (): Promise<CategoryDish[]> => {
      if (hasPin) {
        const { dishes } = await restaurantApi.getNearbyDishes({
          lat: lat as number,
          lng: lng as number,
          category: cuisine,
          radius: CUSTOMER_DISCOVERY_RADIUS_KM,
          limit: restaurantLimit,
          itemLimit: 48,
        });
        return dishes.map((d) => ({
          id: d.itemId,
          name: d.name,
          price: d.price,
          imageUrl: d.image ?? undefined,
          isVeg: d.isVeg,
          isAvailable: true,
          categoryName: d.categoryName,
          restaurantId: d.restaurantId,
          restaurantName: d.restaurantName,
        }));
      }

      // No pin — empty rather than city-wide fake browse.
      return [];
    },
    enabled:
      input.enabled !== false &&
      Boolean(cuisine) &&
      cuisine !== 'all' &&
      cuisine !== 'popular',
    staleTime: 60_000,
    retry: 1,
  });
}

export function useRestaurant(
  restaurantId: string,
  coords?: { lat?: number; lng?: number } | null
) {
  return useQuery({
    queryKey: [
      ...restaurantKeys.detail(restaurantId),
      coords?.lat ?? null,
      coords?.lng ?? null,
    ],
    queryFn: () =>
      restaurantApi.getRestaurant(restaurantId, {
        lat: coords?.lat,
        lng: coords?.lng,
      }),
    enabled: Boolean(restaurantId),
  });
}

export function useRestaurantBySlug(
  slug: string,
  coords?: { lat?: number; lng?: number } | null
) {
  return useQuery({
    queryKey: [
      ...restaurantKeys.slug(slug),
      coords?.lat ?? null,
      coords?.lng ?? null,
    ],
    queryFn: () =>
      restaurantApi.getRestaurantBySlug(slug, {
        lat: coords?.lat,
        lng: coords?.lng,
      }),
    enabled: Boolean(slug),
  });
}

export function useRestaurantCuisines() {
  return useQuery({
    queryKey: restaurantKeys.cuisines(),
    queryFn: (): Promise<CuisineChip[]> => restaurantApi.getCuisines(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * What's on your mind — unique cuisines from restaurants near the user pin.
 * Refetches when location / radius changes; new nearby outlets appear automatically.
 */
export function useNearbyMindCategories(
  coords?: { lat?: number; lng?: number } | null,
  options?: { radiusKm?: number; restaurantLimit?: number; enabled?: boolean }
) {
  const lat = coords?.lat;
  const lng = coords?.lng;
  const radius = options?.radiusKm ?? CUSTOMER_DISCOVERY_RADIUS_KM;
  const limit = options?.restaurantLimit ?? 40;

  return useQuery({
    queryKey: restaurantKeys.mindCategories({
      lat: lat ?? 0,
      lng: lng ?? 0,
      radius,
      limit,
    }),
    queryFn: () =>
      restaurantApi.getNearbyMindCategories({
        lat: lat as number,
        lng: lng as number,
        radius,
        limit,
      }),
    enabled:
      options?.enabled !== false &&
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    meta: { persist: false },
  });
}

export function useRestaurantTimings(restaurantId: string) {
  return useQuery({
    queryKey: restaurantKeys.timings(restaurantId),
    queryFn: () => restaurantApi.getTimings(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 60_000,
  });
}

export function useRestaurantHolidays(restaurantId: string) {
  return useQuery({
    queryKey: [...restaurantKeys.all, 'holidays', restaurantId],
    queryFn: () => restaurantApi.getHolidays(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60_000,
  });
}

export function useRestaurantSpecialHours(restaurantId: string) {
  return useQuery({
    queryKey: [...restaurantKeys.all, 'special-hours', restaurantId],
    queryFn: () => restaurantApi.getSpecialHours(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60_000,
  });
}

export function useRestaurantHygiene(restaurantId: string) {
  return useQuery({
    queryKey: restaurantKeys.hygiene(restaurantId),
    queryFn: () => restaurantApi.getHygiene(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60_000,
  });
}

export function useRestaurantRatings(restaurantId: string) {
  return useQuery({
    queryKey: restaurantKeys.ratings(restaurantId),
    queryFn: () => restaurantApi.getRatings(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 60_000,
  });
}

export function useUnavailableItemIds(restaurantId: string) {
  return useQuery({
    queryKey: restaurantKeys.unavailable(restaurantId),
    queryFn: () => restaurantApi.getUnavailableItemIds(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 30_000,
  });
}

export function useItemCustomizations(
  restaurantId: string,
  itemId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: restaurantKeys.customizations(restaurantId, itemId),
    queryFn: () => restaurantApi.getItemCustomizations(restaurantId, itemId),
    enabled:
      Boolean(restaurantId && itemId) && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useRecommendedMenuItems(restaurantId: string) {
  return useQuery({
    queryKey: restaurantKeys.recommendedItems(restaurantId),
    queryFn: () =>
      restaurantApi.getItems(restaurantId, { recommended: true }),
    enabled: Boolean(restaurantId),
    staleTime: 60_000,
  });
}

export function useKitchenAlerts(options?: { enabled?: boolean }) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: restaurantKeys.alerts(),
    queryFn: async () => {
      try {
        const { customerApi } = await import('@/lib/customer/api');
        const fromCustomer = await customerApi.getMyAlerts();
        if (fromCustomer.length) return fromCustomer;
      } catch {
        // fall through to restaurant-service GET /alerts/me
      }
      return restaurantApi.getMyAlerts();
    },
    enabled: Boolean(token) && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useRestaurantMenu(restaurantId: string) {
  return useQuery({
    queryKey: restaurantKeys.menu(restaurantId),
    queryFn: () => restaurantApi.getMenu(restaurantId),
    enabled: Boolean(restaurantId),
  });
}

export function useRestaurantCategories(restaurantId: string) {
  return useQuery({
    queryKey: restaurantKeys.categories(restaurantId),
    queryFn: () => restaurantApi.getCategories(restaurantId),
    enabled: Boolean(restaurantId),
  });
}

/**
 * Categories for filter chips — unique cuisines from the restaurant list.
 * Mind strip does not use this (builds inline to avoid persisted stale cache).
 */
export function useHomeCategories(restaurants: Restaurant[]) {
  const fingerprint = useMemo(() => {
    const parts: string[] = [];
    for (const r of restaurants) {
      if (!r?.id || r.status === 'deleted') continue;
      for (const c of r.cuisines ?? []) {
        const s = String(c).toLowerCase().trim();
        if (s) parts.push(`${r.id}:${s}`);
      }
    }
    parts.sort();
    return parts.join('|');
  }, [restaurants]);

  return useQuery({
    queryKey: [...restaurantKeys.all, 'home-categories', 'v5-cuisines-only', fingerprint],
    queryFn: (): Promise<HomeCategory[]> =>
      Promise.resolve(buildHomeCategories({ restaurants })),
    enabled: restaurants.length > 0,
    staleTime: 0,
    gcTime: 0,
    placeholderData: () => buildHomeCategories({ restaurants }),
  });
}

export function useRestaurantItems(
  restaurantId: string,
  params: MenuItemListParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: restaurantKeys.items(restaurantId, params as Record<string, unknown>),
    queryFn: () => restaurantApi.getItems(restaurantId, params),
    enabled: Boolean(restaurantId) && options?.enabled !== false,
  });
}

export function prefetchRestaurantMenu(restaurantId: string) {
  if (!restaurantId) return;
  queryClient.prefetchQuery({
    queryKey: restaurantKeys.menu(restaurantId),
    queryFn: () => restaurantApi.getMenu(restaurantId),
  });
  queryClient.prefetchQuery({
    queryKey: restaurantKeys.categories(restaurantId),
    queryFn: () => restaurantApi.getCategories(restaurantId),
  });
  queryClient.prefetchQuery({
    queryKey: restaurantKeys.items(restaurantId),
    queryFn: () => restaurantApi.getItems(restaurantId),
  });
}

export function useMenuItem(restaurantId: string, itemId: string) {
  const isSeed = itemId.startsWith('seed-');
  const restaurant = useRestaurant(restaurantId);

  return useQuery({
    queryKey: restaurantKeys.item(restaurantId, itemId),
    queryFn: async () => {
      if (isSeed) {
        const found = findSeedMenuItem(restaurantId, itemId, {
          name: restaurant.data?.name,
          cuisines: restaurant.data?.cuisines,
        });
        if (!found) throw new Error('Item not found');
        return found;
      }
      return restaurantApi.getItem(restaurantId, itemId);
    },
    enabled: Boolean(
      restaurantId &&
        itemId &&
        (!isSeed || restaurant.isSuccess || restaurant.isError)
    ),
  });
}

export function useRestaurantOffers(restaurantId: string) {
  return useQuery({
    queryKey: restaurantKeys.offers(restaurantId),
    queryFn: () => restaurantApi.getOffers(restaurantId),
    enabled: Boolean(restaurantId),
  });
}

export function useRestaurantOffer(restaurantId: string, offerId: string) {
  return useQuery({
    queryKey: restaurantKeys.offer(restaurantId, offerId),
    queryFn: () => restaurantApi.getOffer(restaurantId, offerId),
    enabled: Boolean(restaurantId && offerId),
  });
}

/** Newest restaurants for home horizontal rail. */
export function useNewlyAddedRestaurants(
  city?: string | null,
  options?: { enabled?: boolean; limit?: number }
) {
  return useQuery({
    queryKey: [...restaurantKeys.all, 'newly-added', city ?? '', options?.limit ?? 12],
    queryFn: () =>
      restaurantApi.getNewlyAdded({
        city: city || undefined,
        limit: options?.limit ?? 12,
      }),
    enabled: options?.enabled !== false && Boolean(city),
    staleTime: 60_000,
  });
}

/** Trending dishes (API menus) for home horizontal rail. */
export function useTrendingDishes(
  city?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...restaurantKeys.all, 'trending-dishes', city ?? ''],
    queryFn: () =>
      restaurantApi.getTrendingDishes({
        city: city || undefined,
        restaurantLimit: 8,
        dishLimit: 16,
      }),
    enabled: options?.enabled !== false && Boolean(city),
    staleTime: 90_000,
  });
}

/** Merges menu + categories + items; falls back to cuisine-specific seed menu. */
export function useFullMenu(
  restaurantId: string,
  seedOptions?: SeedMenuOptions
) {
  const menu = useRestaurantMenu(restaurantId);
  const categories = useRestaurantCategories(restaurantId);
  const items = useRestaurantItems(restaurantId);
  const unavailable = useUnavailableItemIds(restaurantId);
  const recommended = useRecommendedMenuItems(restaurantId);

  const menuFromApi = menu.data ?? { categories: [], items: [] };
  const categoriesFromApi = categories.data ?? [];
  const itemsFromApi = items.data ?? [];
  const unavailableIds = useMemo(
    () => new Set(unavailable.data ?? []),
    [unavailable.data]
  );

  const menuItemsLookValid = menuFromApi.items.some(
    (item) => item.name && item.name !== 'Item' && item.price > 0
  );

  const mergedCategories = menuFromApi.categories.length
    ? menuFromApi.categories
    : categoriesFromApi;

  const mergedItems = useMemo(() => {
    const base = menuItemsLookValid
      ? menuFromApi.items
      : itemsFromApi.length
        ? itemsFromApi
        : menuFromApi.items;

    const enriched =
      menuItemsLookValid && itemsFromApi.length
        ? enrichMenuItems(base, itemsFromApi)
        : base;

    if (!unavailableIds.size) return enriched;
    return enriched.map((item: MenuItem) =>
      unavailableIds.has(item.id) ? { ...item, isAvailable: false } : item
    );
  }, [
    menuItemsLookValid,
    menuFromApi.items,
    itemsFromApi,
    unavailableIds,
  ]);

  const isLoading = menu.isLoading || categories.isLoading || items.isLoading;
  const isError = menu.isError && categories.isError && items.isError;
  const isSeeded = false;

  return {
    categories: mergedCategories,
    items: mergedItems,
    recommended: recommended.data ?? [],
    unavailableIds: [...unavailableIds],
    isLoading,
    isError,
    isSeeded,
    refetch: () => {
      menu.refetch();
      categories.refetch();
      items.refetch();
      unavailable.refetch();
      recommended.refetch();
    },
  };
}

// ------------------------------------------------------------------
// Mutations for Menu Items (Owner/Admin)
// ------------------------------------------------------------------

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateMenuItem(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { categoryId: string; payload: Record<string, unknown> }) =>
      restaurantApi.createItem(restaurantId, params.categoryId, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.itemsPrefix(restaurantId) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.menu(restaurantId) });
    },
  });
}

export function useUpdateMenuItem(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { itemId: string; payload: Record<string, unknown> }) =>
      restaurantApi.updateItem(restaurantId, params.itemId, params.payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.itemsPrefix(restaurantId) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.menu(restaurantId) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.item(restaurantId, variables.itemId) });
    },
  });
}

export function useDeleteMenuItem(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => restaurantApi.deleteItem(restaurantId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.itemsPrefix(restaurantId) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.menu(restaurantId) });
    },
  });
}

export function useUpdateMenuItemAvailability(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { itemId: string; isAvailable: boolean }) =>
      restaurantApi.updateItemAvailability(restaurantId, params.itemId, params.isAvailable),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.itemsPrefix(restaurantId) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.menu(restaurantId) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.item(restaurantId, variables.itemId) });
    },
  });
}

export function useUploadMenuItemImage(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { itemId: string; formData: FormData }) =>
      restaurantApi.uploadItemImage(restaurantId, params.itemId, params.formData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.itemsPrefix(restaurantId) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.menu(restaurantId) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.item(restaurantId, variables.itemId) });
    },
  });
}

export function useBulkUpdateItemAvailability(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { itemIds: string[]; isAvailable: boolean }) =>
      restaurantApi.bulkUpdateAvailability(restaurantId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.itemsPrefix(restaurantId) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.menu(restaurantId) });
    },
  });
}

export function useBulkImportMenuItems(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => restaurantApi.bulkImportItems(restaurantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.itemsPrefix(restaurantId) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.menu(restaurantId) });
    },
  });
}

export function useNotifyOpen(restaurantId: string) {
  const queryClient = useQueryClient();
  const subscribe = useMutation({
    mutationFn: () => restaurantApi.subscribeNotifyOpen(restaurantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: ['customer', 'alerts'] });
    },
  });
  const unsubscribe = useMutation({
    mutationFn: () => restaurantApi.unsubscribeNotifyOpen(restaurantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: ['customer', 'alerts'] });
    },
  });
  return { subscribe, unsubscribe };
}

export function useNotifyStock(restaurantId: string, itemId: string) {
  const queryClient = useQueryClient();
  const subscribe = useMutation({
    mutationFn: () => restaurantApi.subscribeNotifyStock(restaurantId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: ['customer', 'alerts'] });
    },
  });
  const unsubscribe = useMutation({
    mutationFn: () =>
      restaurantApi.unsubscribeNotifyStock(restaurantId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: ['customer', 'alerts'] });
    },
  });
  return { subscribe, unsubscribe };
}
