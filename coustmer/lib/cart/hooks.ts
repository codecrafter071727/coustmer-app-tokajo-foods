import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { cartApi } from '@/lib/cart/api';
import type {
  AddCartItemPayload,
  ApplyCouponPayload,
  Cart,
  SaveCartPayload,
  UpdateCartItemPayload,
  UpdateDeliveryAddressPayload,
  UpdateDeliveryTypePayload,
  UpdateTipPayload,
} from '@/lib/cart/types';
import { applyServerCartToStore } from '@/lib/cart/sync';

export const cartKeys = {
  all: ['cart'] as const,
  health: () => [...cartKeys.all, 'health'] as const,
  current: () => [...cartKeys.all, 'current'] as const,
  saved: () => [...cartKeys.all, 'saved'] as const,
};

function syncAndInvalidate(
  queryClient: ReturnType<typeof useQueryClient>,
  cart: Cart
) {
  applyServerCartToStore(cart);
  queryClient.invalidateQueries({ queryKey: cartKeys.all });
}

/** GET /cart/health */
export function useCartHealth(enabled = true) {
  return useQuery({
    queryKey: cartKeys.health(),
    queryFn: cartApi.health,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

/** GET /cart */
export function useCart(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: cartKeys.current(),
    queryFn: async () => {
      const cart = await cartApi.getCart();
      applyServerCartToStore(cart);
      return cart;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}

/** GET /cart/saved */
export function useSavedCarts(enabled = true) {
  return useQuery({
    queryKey: cartKeys.saved(),
    queryFn: cartApi.getSavedCarts,
    enabled,
  });
}

/** POST /cart/items */
export function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddCartItemPayload) => cartApi.addItem(payload),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** PUT /cart/items/:itemId */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: UpdateCartItemPayload;
    }) => cartApi.updateItem(itemId, payload),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** DELETE /cart/items/:itemId */
export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** DELETE /cart */
export function useClearRemoteCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.clearCart(),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** POST /cart/validate */
export function useValidateCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.validate(),
    onSuccess: (result) => {
      if (result.cart) {
        applyServerCartToStore(result.cart);
        queryClient.setQueryData(cartKeys.current(), result.cart);
      }
      // Refresh bill / prices after validate (even when valid)
      queryClient.invalidateQueries({ queryKey: cartKeys.current() });
    },
  });
}

/** POST /cart/coupon */
export function useApplyCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyCouponPayload) => cartApi.applyCoupon(payload),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** DELETE /cart/coupon */
export function useRemoveCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** PUT /cart/tip */
export function useUpdateCartTip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTipPayload) => cartApi.updateTip(payload),
    onSuccess: (cart) => {
      // Only hydrate what the server actually returned (tip must be on cart)
      applyServerCartToStore(cart);
      queryClient.setQueryData(cartKeys.current(), cart);
    },
  });
}

/** PUT /cart/delivery-address */
export function useUpdateCartDeliveryAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDeliveryAddressPayload) =>
      cartApi.updateDeliveryAddress(payload),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** PUT /cart/delivery-type */
export function useUpdateCartDeliveryType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDeliveryTypePayload) =>
      cartApi.updateDeliveryType(payload),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** POST /cart/merge */
export function useMergeCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.merge(),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** POST /cart/save */
export function useSaveCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: SaveCartPayload) => cartApi.saveCart(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.saved() });
    },
  });
}

/** POST /cart/saved/:id/restore */
export function useRestoreSavedCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (savedCartId: string) => cartApi.restoreSavedCart(savedCartId),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** DELETE /cart/saved/:id */
export function useDeleteSavedCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (savedCartId: string) => cartApi.deleteSavedCart(savedCartId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.saved() });
    },
  });
}
