import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { reviewApi } from '@/lib/review/api';
import type {
  ReportReviewPayload,
  SubmitDishReviewsPayload,
  SubmitOrderReviewPayload,
  SubmitReviewPayload,
} from '@/lib/review/types';

export const reviewKeys = {
  all: ['review'] as const,
  health: () => [...reviewKeys.all, 'health'] as const,
  ready: () => [...reviewKeys.all, 'ready'] as const,
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

/** GET /health/ready */
export function useReviewServiceReady(enabled = false) {
  return useQuery({
    queryKey: reviewKeys.ready(),
    queryFn: reviewApi.ready,
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

/** PUT /restaurants/:restaurantId/reviews/:reviewId */
export function useUpdateRestaurantReview(restaurantId: string, reviewId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitReviewPayload) =>
      reviewApi.updateRestaurantReview(restaurantId, reviewId, payload),
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

/** DELETE /restaurants/:restaurantId/reviews/:reviewId */
export function useDeleteRestaurantReview(restaurantId: string, reviewId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reviewApi.deleteRestaurantReview(restaurantId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...reviewKeys.all, 'restaurant', restaurantId],
      });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

/** POST /restaurants/:restaurantId/reviews/:reviewId/report */
export function useReportRestaurantReview(restaurantId: string, reviewId: string) {
  return useMutation({
    mutationFn: (payload: ReportReviewPayload) =>
      reviewApi.reportRestaurantReview(restaurantId, reviewId, payload),
  });
}

/** POST /orders/:orderId/reviews */
export function useSubmitOrderReview(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitOrderReviewPayload) =>
      reviewApi.submitOrderReview(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.orderReview(orderId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

/** POST /orders/:orderId/reviews/dishes */
export function useSubmitDishReviews(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitDishReviewsPayload) =>
      reviewApi.submitDishReviews(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.orderReview(orderId) });
    },
  });
}
