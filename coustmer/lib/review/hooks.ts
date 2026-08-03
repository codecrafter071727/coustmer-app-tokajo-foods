import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { reviewApi } from '@/lib/review/api';
import type { SubmitReviewPayload } from '@/lib/review/types';

export const reviewKeys = {
  all: ['review'] as const,
  health: () => [...reviewKeys.all, 'health'] as const,
  restaurantReviews: (
    restaurantId: string,
    params?: { page?: number; limit?: number }
  ) =>
    [...reviewKeys.all, 'restaurant', restaurantId, 'list', params ?? {}] as const,
  restaurantStats: (restaurantId: string) =>
    [...reviewKeys.all, 'restaurant', restaurantId, 'stats'] as const,
  orderReview: (orderId: string) =>
    [...reviewKeys.all, 'order', orderId] as const,
};

/** GET /health */
export function useReviewServiceHealth(enabled = false) {
  return useQuery({
    queryKey: reviewKeys.health(),
    queryFn: reviewApi.health,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

/** GET /restaurants/:restaurantId/reviews */
export function useRestaurantReviews(
  restaurantId: string,
  params?: { page?: number; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: reviewKeys.restaurantReviews(restaurantId, params),
    queryFn: () => reviewApi.getRestaurantReviews(restaurantId, params),
    enabled: Boolean(restaurantId) && (options?.enabled ?? true),
    staleTime: 30_000,
    retry: 1,
  });
}

/** GET /restaurants/:restaurantId/reviews/stats */
export function useRestaurantReviewStats(
  restaurantId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: reviewKeys.restaurantStats(restaurantId),
    queryFn: () => reviewApi.getRestaurantReviewStats(restaurantId),
    enabled: Boolean(restaurantId) && (options?.enabled ?? true),
    staleTime: 30_000,
    retry: 1,
  });
}

/** GET /orders/:orderId/review */
export function useOrderReview(
  orderId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: reviewKeys.orderReview(orderId),
    queryFn: () => reviewApi.getOrderReview(orderId),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
    staleTime: 15_000,
    retry: 1,
  });
}

/** POST /restaurants/:restaurantId/reviews */
export function useSubmitRestaurantReview(restaurantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitReviewPayload) =>
      reviewApi.submitRestaurantReview(restaurantId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...reviewKeys.all, 'restaurant', restaurantId],
      });
      if (variables.orderId) {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.orderReview(variables.orderId),
        });
      }
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}
