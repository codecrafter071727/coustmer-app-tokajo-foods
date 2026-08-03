import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { searchApi } from '@/lib/search/api';
import type {
  SearchCombinedParams,
  SearchDishesParams,
  SearchRestaurantsParams,
  SearchSuggestionsParams,
} from '@/lib/search/types';

export const searchKeys = {
  all: ['search'] as const,
  health: () => [...searchKeys.all, 'health'] as const,
  restaurants: (params: SearchRestaurantsParams) =>
    [...searchKeys.all, 'restaurants', params] as const,
  dishes: (params: SearchDishesParams) =>
    [...searchKeys.all, 'dishes', params] as const,
  combined: (params: SearchCombinedParams) =>
    [...searchKeys.all, 'combined', params] as const,
  suggestions: (params: SearchSuggestionsParams) =>
    [...searchKeys.all, 'suggestions', params] as const,
  catalog: () => [...searchKeys.all, 'catalog'] as const,
};

/** Debounce a string for search inputs (default 220ms). */
export function useDebouncedValue<T>(value: T, delayMs = 220): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/** Warm restaurant catalog so fallback search stays snappy. */
export function usePrefetchSearchCatalog() {
  return useQuery({
    queryKey: searchKeys.catalog(),
    queryFn: () => searchApi.prefetchCatalog(),
    staleTime: 90_000,
    retry: 1,
  });
}

/** GET /health */
export function useSearchServiceHealth(enabled = false) {
  return useQuery({
    queryKey: searchKeys.health(),
    queryFn: searchApi.health,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

/** GET /restaurants (?q=&cuisine=&lat=&lng=&sort=) */
export function useSearchRestaurants(
  params: SearchRestaurantsParams,
  options?: { enabled?: boolean }
) {
  const hasQuery = Boolean(params.q?.trim() || params.cuisine);

  return useQuery({
    queryKey: searchKeys.restaurants(params),
    queryFn: () => searchApi.searchRestaurants(params),
    enabled: (options?.enabled ?? true) && hasQuery,
    staleTime: 20_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}

/** GET /dishes (?q=&restaurantId=&veg=) */
export function useSearchDishes(
  params: SearchDishesParams,
  options?: { enabled?: boolean }
) {
  const hasQuery = Boolean(params.q?.trim() || params.restaurantId);

  return useQuery({
    queryKey: searchKeys.dishes(params),
    queryFn: () => searchApi.searchDishes(params),
    enabled: (options?.enabled ?? true) && hasQuery,
    staleTime: 20_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}

/** GET /combined — primary Search screen query. Starts from 1 char. */
export function useSearchCombined(
  params: SearchCombinedParams,
  options?: { enabled?: boolean }
) {
  const q = params.q.trim();

  return useQuery({
    queryKey: searchKeys.combined({ ...params, q }),
    queryFn: () => searchApi.searchCombined({ ...params, q }),
    enabled: (options?.enabled ?? true) && q.length >= 1,
    staleTime: 12_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}

/** GET /suggestions — autocomplete from 1 char. */
export function useSearchSuggestions(
  params: SearchSuggestionsParams,
  options?: { enabled?: boolean }
) {
  const q = params.q.trim();

  return useQuery({
    queryKey: searchKeys.suggestions({ ...params, q }),
    queryFn: () => searchApi.getSuggestions({ ...params, q }),
    enabled: (options?.enabled ?? true) && q.length >= 1,
    staleTime: 8_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
