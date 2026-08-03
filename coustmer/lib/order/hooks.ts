import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { orderApi } from '@/lib/order/api';
import type {
  CancelOrderPayload,
  CreateOrderPayload,
  ReportIssuePayload,
  TipPayload,
} from '@/lib/order/types';

export const orderKeys = {
  all: ['order'] as const,
  health: () => [...orderKeys.all, 'health'] as const,
  list: (params?: { page?: number; limit?: number }) =>
    [...orderKeys.all, 'list', params ?? {}] as const,
  active: () => [...orderKeys.all, 'active'] as const,
  scheduled: () => [...orderKeys.all, 'scheduled'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  tracking: (id: string) => [...orderKeys.all, 'tracking', id] as const,
  invoice: (id: string) => [...orderKeys.all, 'invoice', id] as const,
  issues: (id: string) => [...orderKeys.all, 'issues', id] as const,
};

function invalidateOrderQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId?: string
) {
  queryClient.invalidateQueries({ queryKey: orderKeys.all });
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    queryClient.invalidateQueries({ queryKey: orderKeys.tracking(orderId) });
    queryClient.invalidateQueries({ queryKey: orderKeys.issues(orderId) });
  }
}

/** GET /health */
export function useOrderServiceHealth(enabled = true) {
  return useQuery({
    queryKey: orderKeys.health(),
    queryFn: orderApi.health,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

/** GET /orders */
export function useOrders(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => orderApi.getOrders(params),
  });
}

/** GET /orders/active */
export function useActiveOrders(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: orderKeys.active(),
    queryFn: orderApi.getActiveOrders,
    refetchInterval: options?.refetchInterval ?? 15_000,
  });
}

/** GET /orders/scheduled */
export function useScheduledOrders() {
  return useQuery({
    queryKey: orderKeys.scheduled(),
    queryFn: orderApi.getScheduledOrders,
  });
}

/** GET /orders/:orderId */
export function useOrder(
  orderId: string,
  options?: {
    refetchInterval?:
      | number
      | false
      | ((query: { state: { data?: { status?: string } } }) => number | false);
  }
) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => orderApi.getOrder(orderId),
    enabled: Boolean(orderId),
    refetchInterval: options?.refetchInterval as number | false | undefined,
  });
}

/** GET /orders/:orderId/tracking */
export function useOrderTracking(
  orderId: string,
  options?: {
    enabled?: boolean;
    refetchInterval?:
      | number
      | false
      | ((query: { state: { data?: { status?: string } } }) => number | false);
  }
) {
  return useQuery({
    queryKey: orderKeys.tracking(orderId),
    queryFn: () => orderApi.getTracking(orderId),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
    refetchInterval: (options?.refetchInterval ?? 10_000) as
      | number
      | false
      | undefined,
  });
}

/** GET /orders/:orderId/issues */
export function useOrderIssues(orderId: string) {
  return useQuery({
    queryKey: orderKeys.issues(orderId),
    queryFn: () => orderApi.getIssues(orderId),
    enabled: Boolean(orderId),
  });
}

/** POST /orders */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => orderApi.createOrder(payload),
    onSuccess: (order) => {
      invalidateOrderQueries(queryClient, order.id);
    },
  });
}

/** POST /orders/:orderId/cancel */
export function useCancelOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: CancelOrderPayload) =>
      orderApi.cancelOrder(orderId, payload),
    onSuccess: () => invalidateOrderQueries(queryClient, orderId),
  });
}

/** POST /orders/:orderId/reorder */
export function useReorder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orderApi.reorder(orderId),
    onSuccess: (result) => {
      invalidateOrderQueries(queryClient, orderId);
      if (result.order?.id) {
        invalidateOrderQueries(queryClient, result.order.id);
      }
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/** PUT /orders/:orderId/tip */
export function useUpdateTip(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TipPayload) => orderApi.updateTip(orderId, payload),
    onSuccess: () => invalidateOrderQueries(queryClient, orderId),
  });
}

/** DELETE /orders/:orderId/scheduled */
export function useCancelScheduledOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orderApi.cancelScheduledOrder(orderId),
    onSuccess: () => invalidateOrderQueries(queryClient, orderId),
  });
}

/** POST /orders/:orderId/issues */
export function useReportIssue(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReportIssuePayload) => {
      const id = String(payload.orderId || orderId || '').trim();
      return orderApi.reportIssue(id, {
        ...payload,
        type: String(payload.type ?? '').trim(),
        description: String(payload.description ?? '').trim(),
      });
    },
    onSuccess: (_data, variables) => {
      const id = String(variables.orderId || orderId || '').trim();
      queryClient.invalidateQueries({ queryKey: orderKeys.issues(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}

/** GET /orders/:orderId/invoice — one-shot fetch via mutation for button press */
export function useFetchInvoice(orderId: string) {
  return useMutation({
    mutationFn: () => orderApi.getInvoice(orderId),
  });
}
