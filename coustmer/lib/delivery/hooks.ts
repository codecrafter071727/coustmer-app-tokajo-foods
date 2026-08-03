import { useQuery } from '@tanstack/react-query';

import { deliveryApi } from '@/lib/delivery/api';

export const deliveryKeys = {
  all: ['delivery'] as const,
  orderPartner: (orderId: string) =>
    [...deliveryKeys.all, 'order-partner', orderId] as const,
};

/**
 * GET /restaurant/orders/:orderId/partner
 * Polls while tracking so the customer card updates when a rider is assigned.
 */
export function useOrderDeliveryPartner(
  orderId: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
  }
) {
  return useQuery({
    queryKey: deliveryKeys.orderPartner(orderId),
    queryFn: () => deliveryApi.getOrderPartner(orderId),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
    staleTime: 8_000,
    refetchInterval: options?.refetchInterval ?? 12_000,
    retry: 1,
  });
}
