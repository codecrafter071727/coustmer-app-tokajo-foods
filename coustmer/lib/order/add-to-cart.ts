import { Alert } from 'react-native';

import { cartApi } from '@/lib/cart/api';
import {
  cartLineLocalId,
  modifiersExtraTotal,
  sameModifiers,
} from '@/lib/cart/modifiers';
import type { CartModifier } from '@/lib/cart/types';
import { applyServerCartToStore } from '@/lib/cart/sync';
import type { MenuItem } from '@/lib/restaurant/types';
import type { CartItem } from '@/store/cart-store';
import { useCartStore } from '@/store/cart-store';

type RestaurantRef = {
  id: string;
  name: string;
  imageUrl?: string;
};

export type AddMenuItemOptions = {
  onAdded?: () => void;
  modifiers?: CartModifier[];
  /** Base menu price before modifiers. Defaults to item.price. */
  basePrice?: number;
};

function findLine(lineOrMenuId: string, modifiers?: CartModifier[] | null) {
  const items = useCartStore.getState().items;
  const withMods = items.find(
    (i) =>
      (i.id === lineOrMenuId ||
        i.menuItemId === lineOrMenuId ||
        i.id.startsWith(`${lineOrMenuId}__`)) &&
      sameModifiers(i.modifiers, modifiers)
  );
  if (withMods || modifiers !== undefined) return withMods;
  return items.find(
    (i) => i.id === lineOrMenuId || i.menuItemId === lineOrMenuId
  );
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
  const altId = line.menuItemId && line.menuItemId !== lineId ? line.menuItemId : null;
  const lineName = line.name;
  const linePrice = line.price;
  const target = Math.max(0, Math.floor(nextQty));

  store.setQuantity(lineId, target);

  try {
    const tryIds = [lineId, altId, menuItemId].filter(Boolean) as string[];
    let synced = false;
    let lastError: unknown = null;

    for (const id of tryIds) {
      try {
        if (target <= 0) {
          const cart = await cartApi.removeItem(id);
          applyServerCartToStore(cart);
        } else {
          const cart = await cartApi.updateItem(id, { quantity: target });
          applyServerCartToStore(cart);
        }
        synced = true;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!synced) {
      const latest = await cartApi.getCart();
      applyServerCartToStore(latest);
      if (target <= 0) {
        const stillExists = latest.items.some(
          (item) =>
            item.id === lineId ||
            item.id === menuItemId ||
            item.menuItemId === menuItemId ||
            (altId ? item.id === altId || item.menuItemId === altId : false) ||
            (item.name === lineName &&
              item.price === linePrice &&
              sameModifiers(item.modifiers, line.modifiers))
        );
        if (!stillExists) {
          return true;
        }
      }
      const resolved = latest.items.find(
        (item) =>
          item.id === lineId ||
          (item.menuItemId === (line.menuItemId || menuItemId) &&
            sameModifiers(item.modifiers, line.modifiers)) ||
          (item.name === lineName &&
            item.price === linePrice &&
            sameModifiers(item.modifiers, line.modifiers))
      );
      if (resolved) {
        if (target <= 0) {
          const cart = await cartApi.removeItem(resolved.id);
          applyServerCartToStore(cart);
        } else {
          const cart = await cartApi.updateItem(resolved.id, { quantity: target });
          applyServerCartToStore(cart);
        }
      } else if (lastError) {
        throw lastError;
      }
    }
    return true;
  } catch (error) {
    store.setQuantity(lineId, previousQty);
    notifyCartError(
      error instanceof Error ? error.message : 'Could not update quantity'
    );
    return false;
  }
}

export async function incrementCartItem(menuItemId: string): Promise<boolean> {
  const line = findLine(menuItemId);
  if (!line) return false;
  return syncCartItemQuantity(line.id, line.quantity + 1);
}

export async function decrementCartItem(menuItemId: string): Promise<boolean> {
  const line = findLine(menuItemId);
  if (!line) return false;
  return syncCartItemQuantity(line.id, line.quantity - 1);
}

async function addRemote(
  item: Omit<CartItem, 'quantity'> & { quantity?: number },
  restaurant: RestaurantRef,
  options?: { onAdded?: () => void }
) {
  const store = useCartStore.getState();
  const modifiers = item.modifiers?.length ? item.modifiers : undefined;
  const menuItemId = item.menuItemId || item.id;
  const basePrice =
    typeof item.basePrice === 'number' ? item.basePrice : item.price;
  const unitPrice = basePrice + modifiersExtraTotal(modifiers);

  const local = store.addItem(
    {
      id: cartLineLocalId(menuItemId, modifiers),
      menuItemId,
      name: item.name,
      price: unitPrice,
      basePrice,
      isVeg: item.isVeg,
      imageUrl: item.imageUrl,
      specialInstructions:
        typeof item.specialInstructions === 'string'
          ? item.specialInstructions
          : undefined,
      modifiers,
      quantity: item.quantity ?? 1,
    },
    restaurant
  );

  if (!local.ok) return local;

  options?.onAdded?.();

  try {
    const cart = await cartApi.addItem({
      menuItemId,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      name: item.name,
      price: basePrice,
      quantity: item.quantity ?? 1,
      isVeg: item.isVeg,
      imageUrl: item.imageUrl,
      specialInstructions:
        typeof item.specialInstructions === 'string'
          ? item.specialInstructions
          : undefined,
      modifiers,
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
  options?: AddMenuItemOptions
) {
  const store = useCartStore.getState();
  const modifiers = options?.modifiers?.length ? options.modifiers : undefined;
  const menuItemId = item.id;
  const basePrice =
    typeof options?.basePrice === 'number' ? options.basePrice : item.price;
  const unitPrice = basePrice + modifiersExtraTotal(modifiers);
  const lineId = cartLineLocalId(menuItemId, modifiers);
  const existing = findLine(menuItemId, modifiers ?? []);

  if (existing) {
    options?.onAdded?.();
    void incrementCartItem(existing.id);
    return true;
  }

  const cartLine = {
    id: lineId,
    menuItemId,
    name: item.name,
    price: unitPrice,
    basePrice,
    isVeg: item.isVeg,
    imageUrl: item.imageUrl,
    specialInstructions:
      typeof item.specialInstructions === 'string'
        ? item.specialInstructions
        : undefined,
    modifiers,
  };

  const result = store.addItem(cartLine, restaurant);

  if (result.ok) {
    options?.onAdded?.();
    void (async () => {
      try {
        const cart = await cartApi.addItem({
          menuItemId,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          name: item.name,
          price: basePrice,
          quantity: 1,
          isVeg: item.isVeg,
          imageUrl: item.imageUrl,
          specialInstructions: cartLine.specialInstructions,
          modifiers,
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
    item: cartLine,
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
