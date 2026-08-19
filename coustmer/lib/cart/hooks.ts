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
  CartValidatePayload,
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
  bill: (lat?: number, lng?: number) => [...cartKeys.all, 'bill', lat, lng] as const,
  summary: () => [...cartKeys.all, 'summary'] as const,
  slots: (date?: string) => [...cartKeys.all, 'slots', date] as const,
  group: () => [...cartKeys.all, 'group'] as const,
  coupons: () => [...cartKeys.all, 'coupons'] as const,
  couponPreview: (code: string) => [...cartKeys.all, 'couponPreview', code] as const,
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
    mutationFn: (payload?: CartValidatePayload) =>
      cartApi.validate(payload ?? {}),
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

/** GET /cart/bill */
export function useCartBill(dropLat?: number, dropLng?: number, enabled = true) {
  return useQuery({
    queryKey: cartKeys.bill(dropLat, dropLng),
    queryFn: () => cartApi.getBill(dropLat, dropLng),
    enabled,
    staleTime: 15_000,
  });
}

/** GET /cart/summary — tab badge count */
export function useCartSummary(enabled = true) {
  return useQuery({
    queryKey: cartKeys.summary(),
    queryFn: cartApi.getSummary,
    enabled,
    staleTime: 10_000,
  });
}

/** PUT /cart/instructions */
export function useUpdateCartInstructions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { cooking?: string; cutlery?: boolean; leaveAtDoor?: boolean }) =>
      cartApi.updateInstructions(payload),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** GET /cart/slots */
export function useCartSlots(date?: string, enabled = true) {
  return useQuery({
    queryKey: cartKeys.slots(date),
    queryFn: () => cartApi.getSlots(date),
    enabled,
    staleTime: 60_000,
  });
}

/** PUT /cart/schedule */
export function useSetCartSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduledFor: string | null) => cartApi.setSchedule(scheduledFor),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** PUT /cart/wallet */
export function useApplyCartWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.applyWallet(),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** DELETE /cart/wallet */
export function useRemoveCartWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.removeWallet(),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** PUT /cart/loyalty */
export function useApplyCartLoyalty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (points?: number) => cartApi.applyLoyalty(points),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** DELETE /cart/loyalty */
export function useRemoveCartLoyalty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.removeLoyalty(),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** POST /cart/share */
export function useShareCart() {
  return useMutation({
    mutationFn: () => cartApi.shareCart(),
  });
}

/** POST /cart/share/:token/join */
export function useJoinGroupCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareToken: string) => cartApi.joinGroup(shareToken),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** GET /cart/group */
export function useCartGroup(enabled = true) {
  return useQuery({
    queryKey: cartKeys.group(),
    queryFn: cartApi.getGroup,
    enabled,
    staleTime: 10_000,
  });
}

/** PUT /cart/group/lock */
export function useLockCartGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.lockGroup(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKeys.group() }),
  });
}

/** DELETE /cart/group/leave */
export function useLeaveCartGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.leaveGroup(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKeys.all }),
  });
}

/** DELETE /cart/group/members/:userId — host kick */
export function useKickCartGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => cartApi.kickMember(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKeys.group() }),
  });
}

/** DELETE /cart/group */
export function useDissolveCartGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.dissolveGroup(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKeys.all }),
  });
}

/** POST /cart/repeat/:orderId */
export function useRepeatOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => cartApi.repeatOrder(orderId),
    onSuccess: (cart) => syncAndInvalidate(queryClient, cart),
  });
}

/** GET /coupons */
export function useDiscoverCoupons(enabled = true) {
  return useQuery({
    queryKey: cartKeys.coupons(),
    queryFn: cartApi.discoverCoupons,
    enabled,
    staleTime: 60_000,
  });
}

/** GET /coupons/:code/preview */
export function useCouponPreview(code: string, enabled = true) {
  return useQuery({
    queryKey: cartKeys.couponPreview(code),
    queryFn: () => cartApi.previewCoupon(code),
    enabled: enabled && code.length >= 2,
    staleTime: 30_000,
  });
}
