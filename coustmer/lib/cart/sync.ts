import type { Cart } from '@/lib/cart/types';
import { useCartStore, type CartItem } from '@/store/cart-store';

function normalizeDeliveryType(value: unknown): 'delivery' | 'takeaway' {
  const v = String(value ?? 'delivery')
    .toLowerCase()
    .trim();
  if (
    v.includes('take') ||
    v.includes('pick') ||
    v === 'self' ||
    v === 'self_pickup' ||
    v === 'collect'
  ) {
    return 'takeaway';
  }
  return 'delivery';
}

/** Hydrate the local Zustand cart from a server cart response. */
export function applyServerCartToStore(cart: Cart) {
  const store = useCartStore.getState();

  const items: CartItem[] = (cart.items ?? []).map((item) => ({
    id: item.id || item.menuItemId,
    menuItemId: item.menuItemId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    isVeg: item.isVeg,
    imageUrl: item.imageUrl,
    specialInstructions: item.specialInstructions,
  }));

  store.hydrateFromServer({
    restaurant: cart.restaurantId
      ? {
          id: cart.restaurantId,
          name: cart.restaurantName || 'Restaurant',
        }
      : null,
    items,
    tip: cart.tip ?? 0,
    specialInstructions: cart.specialInstructions ?? '',
    couponCode: cart.coupon?.code ?? null,
    discount: cart.discount ?? 0,
    deliveryType: normalizeDeliveryType(cart.deliveryType),
    deliveryFee: cart.deliveryFee ?? 0,
    tax: cart.tax ?? 0,
    serverTotal: cart.total,
    scheduledFor: cart.scheduledFor ?? store.scheduledFor,
  });
}
