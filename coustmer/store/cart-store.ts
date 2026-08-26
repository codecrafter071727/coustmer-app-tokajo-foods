import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CartModifier } from '@/lib/cart/types';
import {
  cartLineLocalId,
  sameModifiers,
} from '@/lib/cart/modifiers';

export type CartItem = {
  id: string;
  menuItemId?: string;
  name: string;
  /** Unit price including selected modifiers. */
  price: number;
  basePrice?: number;
  quantity: number;
  isVeg?: boolean;
  imageUrl?: string;
  specialInstructions?: string;
  modifiers?: CartModifier[];
};

type CartRestaurant = {
  id: string;
  name: string;
  imageUrl?: string;
  deliveryTime?: string;
};

export type ReplaceCartPromptData = {
  item: Omit<CartItem, 'quantity'> & { quantity?: number };
  restaurant: CartRestaurant;
  options?: { onAdded?: () => void };
};

export type CartHydratePayload = {
  restaurant: CartRestaurant | null;
  items: CartItem[];
  tip: number;
  specialInstructions: string;
  couponCode: string | null;
  discount: number;
  deliveryType: 'delivery' | 'takeaway';
  deliveryFee: number;
  tax: number;
  serverTotal?: number;
  scheduledFor?: string | null;
};

type CartState = {
  restaurant: CartRestaurant | null;
  items: CartItem[];
  specialInstructions: string;
  tip: number;
  scheduledFor: string | null;
  couponCode: string | null;
  discount: number;
  deliveryType: 'delivery' | 'takeaway';
  deliveryFee: number;
  tax: number;
  serverTotal: number | null;
  /** Selected checkout payment method (cod, upi labels, wallet, saved id, …) */
  paymentMethod: string;
  replaceCartPrompt: ReplaceCartPromptData | null;
  promptReplaceCart: (prompt: ReplaceCartPromptData) => void;
  clearReplaceCartPrompt: () => void;
  addItem: (
    item: Omit<CartItem, 'quantity'> & { quantity?: number },
    restaurant: CartRestaurant
  ) => { ok: true } | { ok: false; reason: 'different_restaurant' };
  setQuantity: (id: string, quantity: number) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  removeItem: (id: string) => void;
  setSpecialInstructions: (value: string) => void;
  setTip: (tip: number) => void;
  setScheduledFor: (iso: string | null) => void;
  setCouponCode: (code: string | null) => void;
  setDiscount: (discount: number) => void;
  setDeliveryType: (type: 'delivery' | 'takeaway') => void;
  setPaymentMethod: (method: string) => void;
  hydrateFromServer: (payload: CartHydratePayload) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
  estimatedTotal: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurant: null,
      items: [],
      specialInstructions: '',
      tip: 0,
      scheduledFor: null,
      couponCode: null,
      discount: 0,
      deliveryType: 'delivery',
      deliveryFee: 0,
      tax: 0,
      serverTotal: null,
      paymentMethod: 'cod',
      replaceCartPrompt: null,

      promptReplaceCart: (prompt) => set({ replaceCartPrompt: prompt }),
      clearReplaceCartPrompt: () => set({ replaceCartPrompt: null }),

      addItem: (item, restaurant) => {
        const state = get();
        if (state.restaurant && state.restaurant.id !== restaurant.id) {
          return { ok: false as const, reason: 'different_restaurant' as const };
        }

        const qty = Math.max(1, item.quantity ?? 1);
        const menuItemId = item.menuItemId || item.id;
        const lineId =
          item.id && item.id !== menuItemId
            ? item.id
            : cartLineLocalId(menuItemId, item.modifiers);
        const existing = state.items.find(
          (i) =>
            (i.id === lineId ||
              i.id === item.id ||
              (i.menuItemId || i.id) === menuItemId) &&
            sameModifiers(i.modifiers, item.modifiers)
        );

        set({
          restaurant,
          serverTotal: null,
          items: existing
            ? state.items.map((i) =>
                i.id === existing.id
                  ? { ...i, quantity: i.quantity + qty }
                  : i
              )
            : [
                ...state.items,
                {
                  id: lineId,
                  menuItemId,
                  name: item.name,
                  price: item.price,
                  basePrice: item.basePrice,
                  quantity: qty,
                  isVeg: item.isVeg,
                  imageUrl: item.imageUrl,
                  specialInstructions: item.specialInstructions,
                  modifiers: item.modifiers?.length ? item.modifiers : undefined,
                },
              ],
        });

        return { ok: true as const };
      },

      setQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            const items = state.items.filter((i) => !(i.id === id || i.menuItemId === id));
            return {
              items,
              restaurant: items.length ? state.restaurant : null,
              serverTotal: null,
            };
          }
          return {
            items: state.items.map((i) =>
              (i.id === id || i.menuItemId === id) ? { ...i, quantity } : i
            ),
            serverTotal: null,
          };
        }),

      increment: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            (i.id === id || i.menuItemId === id) ? { ...i, quantity: i.quantity + 1 } : i
          ),
          serverTotal: null,
        })),

      decrement: (id) =>
        set((state) => {
          const items = state.items
            .map((i) =>
              (i.id === id || i.menuItemId === id) ? { ...i, quantity: i.quantity - 1 } : i
            )
            .filter((i) => i.quantity > 0);
          return {
            items,
            restaurant: items.length ? state.restaurant : null,
            serverTotal: null,
          };
        }),

      removeItem: (id) =>
        set((state) => {
          const items = state.items.filter((i) => !(i.id === id || i.menuItemId === id));
          return {
            items,
            restaurant: items.length ? state.restaurant : null,
            serverTotal: null,
          };
        }),

      setSpecialInstructions: (specialInstructions) =>
        set({ specialInstructions }),

      setTip: (tip) => set({ tip: Math.max(0, tip), serverTotal: null }),

      setScheduledFor: (scheduledFor) => set({ scheduledFor }),

      setCouponCode: (couponCode) => set({ couponCode }),

      setDiscount: (discount) =>
        set({ discount: Math.max(0, discount), serverTotal: null }),

      setDeliveryType: (deliveryType) => set({ deliveryType }),

      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

      hydrateFromServer: (payload) =>
        set({
          restaurant: payload.restaurant,
          items: payload.items,
          tip: payload.tip,
          specialInstructions: payload.specialInstructions,
          couponCode: payload.couponCode,
          discount: payload.discount,
          deliveryType: payload.deliveryType,
          deliveryFee: payload.deliveryFee,
          tax: payload.tax,
          serverTotal: payload.serverTotal ?? null,
          scheduledFor:
            payload.scheduledFor !== undefined
              ? payload.scheduledFor
              : get().scheduledFor,
        }),

      clearCart: () =>
        set({
          restaurant: null,
          items: [],
          specialInstructions: '',
          tip: 0,
          scheduledFor: null,
          couponCode: null,
          discount: 0,
          deliveryType: 'delivery',
          deliveryFee: 0,
          tax: 0,
          serverTotal: null,
          paymentMethod: 'cod',
        }),

      totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: () =>
        get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),

      estimatedTotal: () => {
        const state = get();
        if (typeof state.serverTotal === 'number' && Number.isFinite(state.serverTotal)) {
          return Math.max(0, state.serverTotal);
        }
        return Math.max(
          0,
          Math.round(
            (state.subtotal() +
              state.tip +
              state.deliveryFee +
              state.tax -
              state.discount) *
              100
          ) / 100
        );
      },
    }),
    {
      name: 'customer-cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        restaurant: state.restaurant,
        items: state.items,
        specialInstructions: state.specialInstructions,
        tip: state.tip,
        scheduledFor: state.scheduledFor,
        couponCode: state.couponCode,
        discount: state.discount,
        deliveryType: state.deliveryType,
        deliveryFee: state.deliveryFee,
        tax: state.tax,
        paymentMethod: state.paymentMethod,
      }),
    }
  )
);
