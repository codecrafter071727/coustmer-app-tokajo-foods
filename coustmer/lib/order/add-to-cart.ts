import { Alert } from 'react-native';

import { cartApi } from '@/lib/cart/api';
import { applyServerCartToStore } from '@/lib/cart/sync';
import type { MenuItem } from '@/lib/restaurant/types';
import type { CartItem } from '@/store/cart-store';
import { useCartStore } from '@/store/cart-store';

type RestaurantRef = {
  id: string;
  name: string;
  imageUrl?: string;
};

function findLine(menuItemId: string) {
  return useCartStore
    .getState()
    .items.find((i) => i.id === menuItemId || i.menuItemId === menuItemId);
}

function notifyCartError(message: string) {
  Alert.alert('Cart update failed', message);
}

/**
 * Optimistic local qty change, then PUT/DELETE on the server.
 * Reverts local qty if the network call fails.
 */
export async function syncCartItemQuantity(
  menuItemId: string,
  nextQty: number
): Promise<boolean> {
  const store = useCartStore.getState();
  const line = findLine(menuItemId);
  if (!line) return false;

  const previousQty = line.quantity;
  const lineId = line.id;
  const target = Math.max(0, Math.floor(nextQty));

  store.setQuantity(menuItemId, target);

  try {
    if (target <= 0) {
      const cart = await cartApi.removeItem(lineId);
      applyServerCartToStore(cart);
    } else {
      const cart = await cartApi.updateItem(lineId, { quantity: target });
      applyServerCartToStore(cart);
    }
    return true;
  } catch (error) {
    store.setQuantity(menuItemId, previousQty);
    notifyCartError(
      error instanceof Error ? error.message : 'Could not update quantity'
    );
    return false;
  }
}

export async function incrementCartItem(menuItemId: string): Promise<boolean> {
  const line = findLine(menuItemId);
  if (!line) return false;
  return syncCartItemQuantity(menuItemId, line.quantity + 1);
}

export async function decrementCartItem(menuItemId: string): Promise<boolean> {
  const line = findLine(menuItemId);
  if (!line) return false;
  return syncCartItemQuantity(menuItemId, line.quantity - 1);
}

async function addRemote(
  item: Omit<CartItem, 'quantity'> & { quantity?: number },
  restaurant: RestaurantRef,
  options?: { onAdded?: () => void }
) {
  const store = useCartStore.getState();
  const local = store.addItem(
    {
      id: item.id,
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      isVeg: item.isVeg,
      imageUrl: item.imageUrl,
      specialInstructions:
        typeof item.specialInstructions === 'string'
          ? item.specialInstructions
          : undefined,
    },
    restaurant
  );

  if (!local.ok) return local;

  options?.onAdded?.();

  try {
    const cart = await cartApi.addItem({
      menuItemId: item.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      name: item.name,
      price: item.price,
      quantity: item.quantity ?? 1,
      isVeg: item.isVeg,
      imageUrl: item.imageUrl,
    });
    applyServerCartToStore(cart);
  } catch (error) {
    notifyCartError(
      error instanceof Error
        ? error.message
        : 'Item saved on device only — will sync when online'
    );
  }

  return { ok: true as const };
}

export function addMenuItemToCart(
  item: MenuItem,
  restaurant: RestaurantRef,
  options?: { onAdded?: () => void }
) {
  const store = useCartStore.getState();
  const existing = findLine(item.id);

  // Already in cart → increment via PUT, not another POST of qty 1
  if (existing) {
    options?.onAdded?.();
    void incrementCartItem(item.id);
    return true;
  }

  const result = store.addItem(
    {
      id: item.id,
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      isVeg: item.isVeg,
      imageUrl: item.imageUrl,
      specialInstructions:
        typeof item.specialInstructions === 'string'
          ? item.specialInstructions
          : undefined,
    },
    restaurant
  );

  if (result.ok) {
    options?.onAdded?.();
    void (async () => {
      try {
        const cart = await cartApi.addItem({
          menuItemId: item.id,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          name: item.name,
          price: item.price,
          quantity: 1,
          isVeg: item.isVeg,
          imageUrl: item.imageUrl,
        });
        applyServerCartToStore(cart);
      } catch (error) {
        notifyCartError(
          error instanceof Error
            ? error.message
            : 'Item saved on device only — will sync when online'
        );
      }
    })();
    return true;
  }

  store.promptReplaceCart({
    item: {
      id: item.id,
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      isVeg: item.isVeg,
      imageUrl: item.imageUrl,
      specialInstructions:
        typeof item.specialInstructions === 'string'
          ? item.specialInstructions
          : undefined,
    },
    restaurant,
    options,
  });
  return false;
}

export async function executeReplaceCart(
  item: Omit<CartItem, 'quantity'> & { quantity?: number },
  restaurant: RestaurantRef,
  options?: { onAdded?: () => void }
) {
  const store = useCartStore.getState();
  try {
    await cartApi.clearCart();
  } catch (error) {
    notifyCartError(
      error instanceof Error
        ? error.message
        : 'Could not clear previous cart on server'
    );
  }
  store.clearCart();
  await addRemote(item, restaurant, options);
}
