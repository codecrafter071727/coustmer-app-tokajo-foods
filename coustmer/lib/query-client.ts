import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes — no background refetch while fresh.
      staleTime: 1000 * 60 * 5,
      // Keep unused query data in memory for 10 minutes after the last subscriber
      // unmounts (e.g. navigating away from home). Coming back feels instant.
      gcTime: 1000 * 60 * 10,
      // Retry failed requests twice with default exponential backoff.
      retry: 2,
      // Don't refetch just because the user switches apps and comes back.
      refetchOnWindowFocus: false,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

/** Drop stale home-category caches that used to invent extra chips. */
export function shouldPersistQuery(query: { queryKey: readonly unknown[] }): boolean {
  const key = query.queryKey;
  if (
    Array.isArray(key) &&
    (key.includes('home-categories') || key.includes('mind-categories'))
  ) {
    return false;
  }
  return true;
}
