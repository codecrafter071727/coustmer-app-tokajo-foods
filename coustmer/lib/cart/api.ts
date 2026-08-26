import axios from 'axios';

import { api } from '@/lib/api';
import { mapBillBreakdown, type BillBreakdown } from '@/lib/cart/bill';
import { normalizeScheduleSlotsResponse, type ScheduleSlotsResponse } from '@/lib/cart/schedule';
import { getCartSessionId } from '@/lib/cart/session';
import type {
  AddCartItemPayload,
  ApplyCouponPayload,
  Cart,
  CartAddress,
  CartCoupon,
  CartLineItem,
  CartValidatePayload,
  CartValidationIssue,
  CartValidationResult,
  PaginationMeta,
  SaveCartPayload,
  SavedCart,
  UpdateCartItemPayload,
  UpdateDeliveryAddressPayload,
  UpdateDeliveryTypePayload,
  UpdateTipPayload,
} from '@/lib/cart/types';

const CART_SERVICE = '/api/v1/cart-service';
const CART_BASE = `${CART_SERVICE}/cart`;

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
};

async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
  } = {}
): Promise<Envelope<T>> {
  const { method = 'GET', body } = options;
  const isMutating = method !== 'GET';
  const sessionId = await getCartSessionId();

  try {
    const response = await api.request<Envelope<T> | T>({
      url: path,
      method,
      data: isMutating ? (body ?? {}) : body,
      withCredentials: true,
      headers: {
        Accept: 'application/json',
        ...(isMutating ? { 'Content-Type': 'application/json' } : {}),
        // OptAuth guest session — send common header names
        'X-Session-Id': sessionId,
        'X-Cart-Session-Id': sessionId,
        'X-Guest-Id': sessionId,
      },
    });

    const payload = response.data as Envelope<T> | T;
    if (
      payload &&
      typeof payload === 'object' &&
      ('data' in (payload as object) || 'success' in (payload as object))
    ) {
      return payload as Envelope<T>;
    }

    return { success: true, data: payload as T };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new Error(
          'Network request failed. Check your internet connection and try again.'
        );
      }

      const data = error.response.data as
        | { message?: string; error?: string }
        | undefined;
      const message =
        data?.message ||
        data?.error ||
        `Request failed (${error.response.status})`;

      if (message.toLowerCase().includes('csrf')) {
        throw new Error(
          'Security token expired. Close and reopen the app, then try again.'
        );
      }

      throw new Error(message);
    }

    throw error;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function extractList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  const nested =
    record.items ??
    record.cartItems ??
    record.savedCarts ??
    record.carts ??
    record.results ??
    record.docs ??
    record.list ??
    record.data ??
    [];
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  if (nested && typeof nested === 'object') return extractList(nested);
  return [];
}

function mapLineItem(raw: Record<string, unknown>): CartLineItem {
  const menuItemId = String(
    raw.menuItemId ?? raw.itemId ?? raw.productId ?? raw._id ?? raw.id ?? ''
  );
  const lineId = String(
    raw.cartItemId ?? raw.lineId ?? raw._id ?? raw.id ?? menuItemId
  );

  const modifiersRaw = raw.modifiers ?? raw.options ?? [];
  const modifiers = Array.isArray(modifiersRaw)
    ? modifiersRaw
        .map((row) => {
          const m = asRecord(row);
          const groupId = String(m.groupId ?? m.group_id ?? '');
          const optionId = String(m.optionId ?? m.option_id ?? '');
          const optionName = String(m.optionName ?? m.name ?? '');
          if (!groupId || !optionId || !optionName) return null;
          return {
            groupId,
            groupName: String(m.groupName ?? m.group ?? 'Option'),
            optionId,
            optionName,
            price: Number(m.price ?? 0) || 0,
          };
        })
        .filter(Boolean) as CartLineItem['modifiers']
    : undefined;

  const basePrice = Number(raw.price ?? raw.unitPrice ?? raw.basePrice ?? 0) || 0;
  const modifiersTotal = (modifiers ?? []).reduce((s, m) => s + (m.price || 0), 0);
  const itemTotal = Number(raw.itemTotal ?? raw.lineTotal ?? 0);
  const quantity = Number(raw.quantity ?? raw.qty ?? 1) || 1;
  const unitFromTotal =
    itemTotal > 0 && quantity > 0
      ? Math.round((itemTotal / quantity) * 100) / 100
      : 0;

  return {
    id: lineId,
    menuItemId: menuItemId || lineId,
    name: String(raw.name ?? raw.itemName ?? raw.title ?? 'Item'),
    price: unitFromTotal > 0 ? unitFromTotal : basePrice + modifiersTotal,
    basePrice,
    quantity,
    isVeg: raw.isVeg !== undefined ? Boolean(raw.isVeg) : undefined,
    imageUrl: (raw.imageUrl as string) || (raw.image as string) || undefined,
    specialInstructions:
      (raw.specialInstructions as string) ||
      (raw.instructions as string) ||
      (raw.notes as string) ||
      undefined,
    restaurantId:
      String(raw.restaurantId ?? raw.restaurant_id ?? '') || undefined,
    modifiers: modifiers?.length ? modifiers : undefined,
  };
}

function mapAddress(raw: unknown): CartAddress | null {
  if (!raw) return null;
  if (typeof raw === 'string') return { formattedAddress: raw };
  const a = asRecord(raw);
  return {
    label: (a.label as string) || undefined,
    formattedAddress:
      (a.formattedAddress as string) ||
      (a.fullAddress as string) ||
      (a.address as string) ||
      undefined,
    street: (a.street as string) || undefined,
    area: (a.area as string) || undefined,
    city: (a.city as string) || undefined,
    state: (a.state as string) || undefined,
    pincode: String(a.pincode ?? a.pinCode ?? a.zip ?? '') || undefined,
    contactName: (a.contactName as string) || undefined,
    contactPhone: (a.contactPhone as string) || undefined,
    addressId: String(a.addressId ?? a._id ?? a.id ?? '') || undefined,
    lat:
      typeof a.lat === 'number'
        ? a.lat
        : Number((a.location as { coordinates?: number[] })?.coordinates?.[1]) ||
          undefined,
    lng:
      typeof a.lng === 'number'
        ? a.lng
        : Number((a.location as { coordinates?: number[] })?.coordinates?.[0]) ||
          undefined,
  };
}

function mapCoupon(raw: unknown): CartCoupon | null {
  if (!raw) return null;
  if (typeof raw === 'string') return { code: raw };
  const c = asRecord(raw);
  const code = String(c.code ?? c.couponCode ?? c.promoCode ?? '');
  if (!code) return null;
  return {
    code,
    discount: Number(c.discount ?? c.discountAmount ?? c.amount ?? 0) || undefined,
    discountType: (c.discountType as string) || (c.type as string) || undefined,
    description: (c.description as string) || (c.message as string) || undefined,
  };
}

function pickFiniteNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function istDateYYYYMMDD(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function mapCart(data: unknown): Cart {
  const raw = asRecord(data);
  const nestedCart =
    raw.cart && typeof raw.cart === 'object' ? asRecord(raw.cart) : raw;

  const itemsRaw =
    nestedCart.items ?? nestedCart.cartItems ?? nestedCart.lineItems ?? [];
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => mapLineItem(asRecord(row)))
    : [];

  const restaurant =
    nestedCart.restaurant && typeof nestedCart.restaurant === 'object'
      ? asRecord(nestedCart.restaurant)
      : undefined;

  const pricing = asRecord(
    nestedCart.pricing ??
      nestedCart.bill ??
      nestedCart.summary ??
      nestedCart.charges ??
      nestedCart.amounts ??
      {}
  );

  const itemsSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const subtotal =
    pickFiniteNumber(
      nestedCart.subtotal,
      nestedCart.itemTotal,
      nestedCart.itemsTotal,
      pricing.subtotal,
      pricing.itemTotal
    ) ?? itemsSubtotal;

  const tip =
    pickFiniteNumber(
      nestedCart.tip,
      nestedCart.tipAmount,
      nestedCart.deliveryTip,
      nestedCart.riderTip,
      pricing.tip,
      pricing.tipAmount,
      pricing.deliveryTip
    ) ?? 0;

  const discount =
    pickFiniteNumber(
      nestedCart.discount,
      nestedCart.couponDiscount,
      nestedCart.promoDiscount,
      pricing.discount,
      pricing.couponDiscount
    ) ?? 0;

  const deliveryFee =
    pickFiniteNumber(
      nestedCart.deliveryFee,
      nestedCart.deliveryCharge,
      nestedCart.shippingFee,
      pricing.deliveryFee,
      pricing.deliveryCharge
    ) ?? 0;

  let tax =
    pickFiniteNumber(
      nestedCart.tax,
      nestedCart.taxes,
      nestedCart.taxAmount,
      nestedCart.gst,
      nestedCart.gstAmount,
      nestedCart.taxesAndCharges,
      nestedCart.taxAndCharges,
      pricing.tax,
      pricing.taxes,
      pricing.gst,
      pricing.taxesAndCharges
    ) ?? 0;

  // Sum named charge rows if present (API sometimes returns charges[])
  const chargesRaw = nestedCart.charges ?? pricing.charges;
  if (Array.isArray(chargesRaw) && tax <= 0) {
    const taxLike = chargesRaw.reduce((sum, row) => {
      const c = asRecord(row);
      const label = String(c.name ?? c.type ?? c.label ?? '').toLowerCase();
      const amount = pickFiniteNumber(c.amount, c.value, c.price) ?? 0;
      if (
        label.includes('tax') ||
        label.includes('gst') ||
        label.includes('vat')
      ) {
        return sum + amount;
      }
      return sum;
    }, 0);
    if (taxLike > 0) tax = taxLike;
  }

  const total =
    pickFiniteNumber(
      nestedCart.total,
      nestedCart.grandTotal,
      nestedCart.payableAmount,
      nestedCart.toPay,
      nestedCart.amountPayable,
      pricing.total,
      pricing.grandTotal,
      pricing.payableAmount
    ) ?? subtotal + tip + deliveryFee + tax - discount;

  // If tax line missing but grand total includes it, derive from API total
  if (
    tax <= 0 &&
    Number.isFinite(total) &&
    total > 0
  ) {
    const withoutTax = subtotal + deliveryFee + tip - discount;
    const implied = Math.round((total - withoutTax) * 100) / 100;
    if (implied > 0.009) tax = implied;
  }

  return {
    id: String(nestedCart._id ?? nestedCart.id ?? nestedCart.cartId ?? '') || undefined,
    restaurantId:
      String(
        nestedCart.restaurantId ??
          restaurant?._id ??
          restaurant?.id ??
          items[0]?.restaurantId ??
          ''
      ) || undefined,
    restaurantName:
      String(
        nestedCart.restaurantName ??
          restaurant?.name ??
          nestedCart.outletName ??
          ''
      ) || undefined,
    items,
    itemCount:
      Number(nestedCart.itemCount ?? nestedCart.totalItems ?? 0) ||
      items.reduce((s, i) => s + i.quantity, 0),
    subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    tip: Number.isFinite(tip) ? tip : 0,
    discount: Number.isFinite(discount) ? discount : 0,
    deliveryFee: Number.isFinite(deliveryFee) ? deliveryFee : 0,
    tax: Number.isFinite(tax) ? tax : 0,
    platformFee:
      pickFiniteNumber(nestedCart.platformFee, pricing.platformFee) ?? 0,
    total: Number.isFinite(total) ? total : subtotal + tip + deliveryFee - discount,
    coupon: mapCoupon(nestedCart.coupon ?? nestedCart.promo ?? nestedCart.appliedCoupon),
    specialInstructions:
      (nestedCart.specialInstructions as string) ||
      (nestedCart.notes as string) ||
      undefined,
    deliveryAddress: mapAddress(
      nestedCart.deliveryAddress ?? nestedCart.address
    ),
    deliveryType: normalizeDeliveryType(
      nestedCart.deliveryType ??
        nestedCart.fulfillmentType ??
        nestedCart.orderType ??
        nestedCart.type
    ),
    scheduledFor:
      (nestedCart.scheduledFor as string) ||
      (nestedCart.scheduledAt as string) ||
      null,
    isScheduled: nestedCart.isScheduled === true || Boolean(nestedCart.scheduledFor),
    updatedAt: (nestedCart.updatedAt as string) || undefined,
  };
}

function mapSavedCart(raw: Record<string, unknown>): SavedCart {
  const itemsRaw = raw.items ?? raw.cartItems ?? [];
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => mapLineItem(asRecord(row)))
    : undefined;

  return {
    id: String(raw._id ?? raw.id ?? raw.savedCartId ?? ''),
    name: (raw.name as string) || (raw.title as string) || undefined,
    restaurantId: String(raw.restaurantId ?? '') || undefined,
    restaurantName: (raw.restaurantName as string) || undefined,
    itemCount:
      Number(raw.itemCount ?? items?.reduce((s, i) => s + i.quantity, 0) ?? 0) ||
      undefined,
    subtotal: Number(raw.subtotal ?? 0) || undefined,
    items,
    createdAt: (raw.createdAt as string) || undefined,
    updatedAt: (raw.updatedAt as string) || undefined,
  };
}

function mapValidation(data: unknown): CartValidationResult {
  const raw = asRecord(data);
  const issuesRaw = raw.issues ?? raw.errors ?? raw.warnings ?? [];
  const issues: CartValidationIssue[] = Array.isArray(issuesRaw)
    ? issuesRaw.map((row) => {
        const r = asRecord(row);
        return {
          itemId: String(r.itemId ?? r.cartItemId ?? '') || undefined,
          menuItemId: String(r.menuItemId ?? '') || undefined,
          code: (r.code as string) || undefined,
          message: String(r.message ?? r.error ?? r.reason ?? 'Validation issue'),
          severity: (r.severity as string) || (r.level as string) || 'error',
        };
      })
    : [];

  const validExplicit = raw.valid ?? raw.isValid;
  const valid =
    typeof validExplicit === 'boolean'
      ? validExplicit
      : issues.filter((i) => i.severity !== 'warning').length === 0;

  const code = typeof raw.code === 'string' ? raw.code : undefined;
  const message = (raw.message as string) || undefined;

  if (issues.length === 0 && code && validExplicit !== true) {
    issues.push({
      code,
      message: message || code,
      severity: 'error',
    });
  }

  return {
    valid,
    issues,
    cart: raw.cart || raw.items ? mapCart(raw.cart ?? raw) : undefined,
    message,
    code,
  };
}

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

function isAuthErrorMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('unauthorized') ||
    m.includes('forbidden') ||
    m.includes('auth') ||
    m.includes('login') ||
    m.includes('sign in') ||
    m.includes('token') ||
    m.includes('csrf') ||
    m.includes('401') ||
    m.includes('403')
  );
}

async function mutateCart(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  bodies: unknown[]
): Promise<Cart> {
  let lastError: Error | null = null;
  for (const body of bodies) {
    try {
      const res = await request<unknown>(path, { method, body });
      return mapCart(res.data ?? res);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Cart request failed');
      if (isAuthErrorMessage(lastError.message)) {
        throw lastError;
      }
    }
  }
  throw lastError ?? new Error('Cart request failed');
}

export const cartApi = {
  /** GET /cart */
  getCart: async (): Promise<Cart> => {
    const res = await request<unknown>(CART_BASE);
    return mapCart(res.data ?? res);
  },

  /** POST /cart/items */
  addItem: async (payload: AddCartItemPayload): Promise<Cart> => {
    const modifiers = (payload.modifiers ?? [])
      .filter((m) => m.groupId && m.optionId && m.optionName)
      .map((m) => ({
        groupId: m.groupId,
        groupName: m.groupName || 'Option',
        optionId: m.optionId,
        optionName: m.optionName,
        price: Math.max(0, Number(m.price) || 0),
      }));
    const instructions =
      payload.specialInstructions?.trim() || undefined;

    return mutateCart(`${CART_BASE}/items`, 'POST', [
      {
        menuItemId: payload.menuItemId,
        restaurantId: payload.restaurantId,
        restaurantName: payload.restaurantName,
        name: payload.name,
        price: payload.price,
        quantity: payload.quantity ?? 1,
        isVeg: payload.isVeg,
        image: payload.imageUrl,
        imageUrl: payload.imageUrl,
        instructions,
        specialInstructions: instructions,
        modifiers: modifiers.length ? modifiers : undefined,
      },
      {
        itemId: payload.menuItemId,
        restaurant_id: payload.restaurantId,
        qty: payload.quantity ?? 1,
        modifiers: modifiers.length ? modifiers : undefined,
        instructions,
      },
    ]);
  },

  /** PUT /cart/items/:itemId */
  updateItem: async (
    itemId: string,
    payload: UpdateCartItemPayload
  ): Promise<Cart> => {
    const quantity =
      typeof payload.quantity === 'number'
        ? Math.max(0, Math.floor(payload.quantity))
        : undefined;
    return mutateCart(`${CART_BASE}/items/${itemId}`, 'PUT', [
      {
        quantity,
        specialInstructions: payload.specialInstructions,
        options: payload.options,
      },
      {
        // Keep quantity key for validators that require it.
        quantity,
        qty: quantity,
        notes: payload.specialInstructions,
      },
      {
        quantity,
      },
    ]);
  },

  /** DELETE /cart/items/:itemId */
  removeItem: async (itemId: string): Promise<Cart> => {
    const res = await request<unknown>(`${CART_BASE}/items/${itemId}`, {
      method: 'DELETE',
      body: {},
    });
    return mapCart(res.data ?? res);
  },

  /** DELETE /cart */
  clearCart: async (): Promise<Cart> => {
    const res = await request<unknown>(CART_BASE, {
      method: 'DELETE',
      body: {},
    });
    // Some backends return empty body
    if (!res.data && !('items' in (res as object))) {
      return mapCart({ items: [] });
    }
    return mapCart(res.data ?? res);
  },

  /** POST /cart/validate — OptAuth; delivery carts must send dropLat + dropLng. */
  validate: async (
    payload: CartValidatePayload = {}
  ): Promise<CartValidationResult> => {
    const sessionId = await getCartSessionId();
    const requestBody: CartValidatePayload = {};
    if (
      payload.dropLat != null &&
      payload.dropLng != null &&
      Number.isFinite(payload.dropLat) &&
      Number.isFinite(payload.dropLng)
    ) {
      requestBody.dropLat = payload.dropLat;
      requestBody.dropLng = payload.dropLng;
    }
    try {
      const response = await api.request<Envelope<unknown> | unknown>({
        url: `${CART_BASE}/validate`,
        method: 'POST',
        data: requestBody,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId,
          'X-Cart-Session-Id': sessionId,
          'X-Guest-Id': sessionId,
        },
        // Treat 4xx as readable so we can map issue lists (not only throw)
        validateStatus: (status) => status >= 200 && status < 500,
      });

      const payload = response.data as Envelope<unknown> | unknown;
      const body =
        payload &&
        typeof payload === 'object' &&
        'data' in (payload as object) &&
        (payload as Envelope<unknown>).data !== undefined
          ? (payload as Envelope<unknown>).data
          : payload;

      const mapped = mapValidation(body ?? payload);

      // HTTP error without a structured validation payload
      if (response.status >= 400 && mapped.valid && mapped.issues.length === 0) {
        const envelope = asRecord(payload);
        const msg =
          (envelope.message as string) ||
          (envelope.error as string) ||
          `Cart validation failed (${response.status})`;
        const code =
          typeof envelope.code === 'string' ? envelope.code : mapped.code;
        return {
          valid: false,
          issues: [{ message: msg, code }],
          message: msg,
          code,
        };
      }

      // Non-2xx with issues → invalid
      if (response.status >= 400) {
        return { ...mapped, valid: false };
      }

      return mapped;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error(
            'Network request failed. Check your internet connection and try again.'
          );
        }
        const data = error.response.data;
        const mapped = mapValidation(data);
        if (mapped.issues.length > 0 || mapped.valid === false) {
          return { ...mapped, valid: false };
        }
        const record = asRecord(data);
        throw new Error(
          String(record.message ?? record.error ?? 'Cart validation failed')
        );
      }
      throw error;
    }
  },

  /** POST /cart/coupon — Auth */
  applyCoupon: async (payload: ApplyCouponPayload): Promise<Cart> => {
    const code = payload.code.trim();
    if (!code) throw new Error('Enter a promo code');

    const bodies = [
      { code },
      { couponCode: code },
      { promoCode: code },
      { coupon: code },
      { code, couponCode: code },
    ];

    let lastError: Error | null = null;
    for (const body of bodies) {
      try {
        const res = await request<unknown>(`${CART_BASE}/coupon`, {
          method: 'POST',
          body,
        });
        const cart = mapCart(res.data ?? res);
        const applied = cart.coupon?.code?.trim().toLowerCase();
        if (applied && applied === code.toLowerCase()) {
          return cart;
        }
        // Discount applied but coupon object missing — still accept if discount moved
        if (!cart.coupon?.code && (cart.discount ?? 0) > 0) {
          return {
            ...cart,
            coupon: { code, discount: cart.discount },
          };
        }
        if (!cart.coupon?.code) {
          throw new Error('Invalid promo code');
        }
        return cart;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Invalid promo code';
        if (isAuthErrorMessage(message)) {
          throw new Error('Please sign in to apply a promo code');
        }
        const lower = message.toLowerCase();
        if (
          lower.includes('invalid') ||
          lower.includes('not found') ||
          lower.includes('expired') ||
          lower.includes('already') ||
          lower.includes('minimum') ||
          lower.includes('not applicable') ||
          lower.includes('not eligible')
        ) {
          throw new Error(message || 'Invalid promo code');
        }
        lastError = error instanceof Error ? error : new Error(message);
      }
    }
    throw lastError ?? new Error('Invalid promo code');
  },

  /** DELETE /cart/coupon — Auth */
  removeCoupon: async (): Promise<Cart> => {
    try {
      const res = await request<unknown>(`${CART_BASE}/coupon`, {
        method: 'DELETE',
        body: {},
      });
      let cart = mapCart(res.data ?? res);

      if (cart.coupon?.code) {
        // Response still showed coupon — confirm with GET
        const verifiedRes = await request<unknown>(CART_BASE);
        cart = mapCart(verifiedRes.data ?? verifiedRes);
      }

      if (cart.coupon?.code) {
        throw new Error('Coupon was not removed from the cart');
      }

      return { ...cart, coupon: null };
    } catch (error) {
      if (error instanceof Error && isAuthErrorMessage(error.message)) {
        throw new Error('Please sign in to remove a promo code');
      }
      throw error;
    }
  },

  /** PUT /cart/tip — Auth only (backend expects tipAmount). */
  updateTip: async (payload: UpdateTipPayload): Promise<Cart> => {
    const tip = Math.max(0, Number(payload.tip) || 0);
    const res = await request<unknown>(`${CART_BASE}/tip`, {
      method: 'PUT',
      body: { tipAmount: tip },
    });
    const cart = mapCart(res.data ?? res);
    const got = Math.max(0, Number(cart.tip) || 0);

    if (tip === 0 || Math.abs(got - tip) < 0.011) {
      return tip === 0 ? { ...cart, tip: 0 } : cart;
    }

    // Confirm via GET /cart when response shape omits tip
    const verifiedRes = await request<unknown>(CART_BASE);
    const verified = mapCart(verifiedRes.data ?? verifiedRes);
    const verifiedTip = Math.max(0, Number(verified.tip) || 0);
    if (Math.abs(verifiedTip - tip) < 0.011) {
      return verified;
    }

    throw new Error('Tip was not saved on the server bill');
  },

  /** PUT /cart/delivery-address — Auth; cart-service only accepts saved addressId. */
  updateDeliveryAddress: async (
    payload: UpdateDeliveryAddressPayload
  ): Promise<Cart> => {
    const addressId = String(payload.addressId ?? '').trim();
    if (!addressId) {
      throw new Error('Pick a saved address to attach to this cart');
    }
    return mutateCart(`${CART_BASE}/delivery-address`, 'PUT', [{ addressId }]);
  },

  /** PUT /cart/delivery-type — Auth; accepts delivery / takeaway (and pickup aliases). */
  updateDeliveryType: async (
    payload: UpdateDeliveryTypePayload
  ): Promise<Cart> => {
    const normalized = normalizeDeliveryType(
      payload.deliveryType ?? payload.type ?? 'delivery'
    );
    const valueVariants =
      normalized === 'takeaway'
        ? ['takeaway', 'pickup', 'TAKEAWAY', 'PICKUP', 'self_pickup']
        : ['delivery', 'DELIVERY', 'home_delivery'];

    const bodies: unknown[] = [];
    for (const value of valueVariants) {
      bodies.push({ deliveryType: value });
      bodies.push({ type: value });
      bodies.push({ fulfillmentType: value });
      bodies.push({ orderType: value });
      bodies.push({ mode: value });
      bodies.push({ delivery_type: value });
      bodies.push({ fulfillment_type: value });
    }

    let lastError: Error | null = null;

    // Prefer PUT, then PATCH — some gateways only accept one verb
    for (const method of ['PUT', 'PATCH'] as const) {
      for (const body of bodies) {
        try {
          const res = await request<unknown>(`${CART_BASE}/delivery-type`, {
            method,
            body,
          });
          const cart = mapCart(res.data ?? res);
          // Ensure local enum stays delivery | takeaway even if API echoed pickup
          return {
            ...cart,
            deliveryType: normalizeDeliveryType(
              cart.deliveryType ?? normalized
            ),
          };
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error('Cart request failed');
          if (isAuthErrorMessage(lastError.message)) {
            throw lastError;
          }
        }
      }
    }

    throw lastError ?? new Error('Failed to update delivery type');
  },

  /** POST /cart/merge */
  merge: async (): Promise<Cart> => {
    const sessionId = await getCartSessionId();
    return mutateCart(`${CART_BASE}/merge`, 'POST', [
      { sessionId },
      { guestSessionId: sessionId },
      { cartSessionId: sessionId },
      {},
    ]);
  },

  /** GET /cart/saved */
  getSavedCarts: async (): Promise<SavedCart[]> => {
    const res = await request<unknown>(`${CART_BASE}/saved`);
    const list = extractList(res.data);
    return (list.length ? list : extractList(res)).map(mapSavedCart);
  },

  /** POST /cart/save */
  saveCart: async (payload: SaveCartPayload = {}): Promise<SavedCart> => {
    const bodies = [
      { name: payload.name },
      { title: payload.name },
      {},
    ];
    let lastError: Error | null = null;
    for (const body of bodies) {
      try {
        const res = await request<Record<string, unknown>>(`${CART_BASE}/save`, {
          method: 'POST',
          body,
        });
        return mapSavedCart(asRecord(res.data ?? res));
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error('Failed to save cart');
      }
    }
    throw lastError ?? new Error('Failed to save cart');
  },

  /** POST /cart/saved/:savedCartId/restore */
  restoreSavedCart: async (savedCartId: string): Promise<Cart> => {
    const res = await request<unknown>(
      `${CART_BASE}/saved/${savedCartId}/restore`,
      { method: 'POST', body: {} }
    );
    return mapCart(res.data ?? res);
  },

  /** DELETE /cart/saved/:savedCartId */
  deleteSavedCart: async (savedCartId: string): Promise<void> => {
    await request(`${CART_BASE}/saved/${savedCartId}`, {
      method: 'DELETE',
      body: {},
    });
  },

  /** GET /cart/bill */
  getBill: async (dropLat?: number, dropLng?: number): Promise<BillBreakdown> => {
    const qs = dropLat != null && dropLng != null
      ? `?dropLat=${dropLat}&dropLng=${dropLng}`
      : '';
    const res = await request<unknown>(`${CART_BASE}/bill${qs}`);
    return mapBillBreakdown(asRecord(res.data ?? res));
  },

  /** GET /cart/summary */
  getSummary: async (): Promise<{ itemCount: number; subtotal: number }> => {
    const res = await request<unknown>(`${CART_BASE}/summary`);
    const d = asRecord(res.data ?? res);
    return {
      itemCount: Number(d.itemCount ?? d.totalItems ?? d.count ?? 0),
      subtotal: Number(d.subtotal ?? d.total ?? 0),
    };
  },

  /** PUT /cart/instructions */
  updateInstructions: async (instructions: {
    cooking?: string;
    cutlery?: boolean;
    leaveAtDoor?: boolean;
  }): Promise<Cart> => {
    return mutateCart(`${CART_BASE}/instructions`, 'PUT', [instructions]);
  },

  /** GET /cart/slots — multi-day when days>1 */
  getSlots: async (opts?: { date?: string; days?: number }): Promise<ScheduleSlotsResponse> => {
    const params = new URLSearchParams();
    if (opts?.date) params.set('date', opts.date);
    if (opts?.days != null) params.set('days', String(opts.days));
    else if (!opts?.date) params.set('days', '7');
    const qs = params.toString();
    const res = await request<unknown>(`${CART_BASE}/slots${qs ? `?${qs}` : ''}`);
    return normalizeScheduleSlotsResponse(res.data ?? res);
  },

  /** PUT /cart/schedule */
  setSchedule: async (scheduledFor: string | null): Promise<Cart> => {
    return mutateCart(`${CART_BASE}/schedule`, 'PUT', [
      { scheduledFor },
      { scheduledAt: scheduledFor },
    ]);
  },

  /** PUT /cart/wallet */
  applyWallet: async (): Promise<Cart> => {
    return mutateCart(`${CART_BASE}/wallet`, 'PUT', [{ apply: true }, {}]);
  },

  /** DELETE /cart/wallet */
  removeWallet: async (): Promise<Cart> => {
    const res = await request<unknown>(`${CART_BASE}/wallet`, { method: 'DELETE', body: {} });
    return mapCart(res.data ?? res);
  },

  /** PUT /cart/loyalty */
  applyLoyalty: async (points?: number): Promise<Cart> => {
    return mutateCart(`${CART_BASE}/loyalty`, 'PUT', [
      { points },
      { apply: true, points },
    ]);
  },

  /** DELETE /cart/loyalty */
  removeLoyalty: async (): Promise<Cart> => {
    const res = await request<unknown>(`${CART_BASE}/loyalty`, { method: 'DELETE', body: {} });
    return mapCart(res.data ?? res);
  },

  /** POST /cart/share */
  shareCart: async (): Promise<{ shareToken: string; shareUrl: string }> => {
    const res = await request<unknown>(`${CART_BASE}/share`, { method: 'POST', body: {} });
    const d = asRecord(res.data ?? res);
    return {
      shareToken: String(d.shareToken ?? d.token ?? ''),
      shareUrl: String(d.shareUrl ?? d.url ?? d.link ?? ''),
    };
  },

  /** GET /cart/share/:shareToken */
  getSharedCart: async (shareToken: string): Promise<Cart> => {
    const res = await request<unknown>(`${CART_BASE}/share/${shareToken}`);
    return mapCart(res.data ?? res);
  },

  /** POST /cart/share/:shareToken/join */
  joinGroup: async (shareToken: string): Promise<Cart> => {
    const res = await request<unknown>(`${CART_BASE}/share/${shareToken}/join`, { method: 'POST', body: {} });
    return mapCart(res.data ?? res);
  },

  /** GET /cart/group */
  getGroup: async (): Promise<Record<string, unknown>> => {
    const res = await request<unknown>(`${CART_BASE}/group`);
    return asRecord(res.data ?? res);
  },

  /** PUT /cart/group/lock */
  lockGroup: async (): Promise<void> => {
    await request(`${CART_BASE}/group/lock`, { method: 'PUT', body: {} });
  },

  /** DELETE /cart/group/leave */
  leaveGroup: async (): Promise<void> => {
    await request(`${CART_BASE}/group/leave`, { method: 'DELETE', body: {} });
  },

  /** DELETE /cart/group/members/:userId */
  kickMember: async (userId: string): Promise<void> => {
    await request(`${CART_BASE}/group/members/${userId}`, { method: 'DELETE', body: {} });
  },

  /** DELETE /cart/group */
  dissolveGroup: async (): Promise<void> => {
    await request(`${CART_BASE}/group`, { method: 'DELETE', body: {} });
  },

  /** POST /cart/repeat/:orderId */
  repeatOrder: async (orderId: string): Promise<Cart> => {
    const res = await request<unknown>(`${CART_BASE}/repeat/${orderId}`, { method: 'POST', body: {} });
    return mapCart(res.data ?? res);
  },

  /** GET /coupons — platform admin coupons + restaurant store offers when restaurantId/lat/lng provided */
  discoverCoupons: async (opts?: {
    restaurantId?: string;
    lat?: number;
    lng?: number;
  }): Promise<Record<string, unknown>[]> => {
    const params = new URLSearchParams();
    if (opts?.restaurantId) params.set('restaurantId', opts.restaurantId);
    if (opts?.lat != null && Number.isFinite(opts.lat)) params.set('lat', String(opts.lat));
    if (opts?.lng != null && Number.isFinite(opts.lng)) params.set('lng', String(opts.lng));
    const qs = params.toString();
    const res = await request<unknown>(`${CART_SERVICE}/coupons${qs ? `?${qs}` : ''}`);
    const payload = res.data ?? res;
    const list = Array.isArray(payload) ? payload : extractList(payload);
    return list.map((row) => asRecord(row));
  },

  /** GET /coupons/:code/preview */
  previewCoupon: async (
    code: string,
    opts?: { restaurantId?: string; subtotal?: number }
  ): Promise<Record<string, unknown>> => {
    const params = new URLSearchParams();
    if (opts?.restaurantId) params.set('restaurantId', opts.restaurantId);
    if (opts?.subtotal != null && Number.isFinite(opts.subtotal)) {
      params.set('subtotal', String(opts.subtotal));
    }
    const qs = params.toString();
    const res = await request<unknown>(
      `${CART_SERVICE}/coupons/${encodeURIComponent(code)}/preview${qs ? `?${qs}` : ''}`
    );
    return asRecord(res.data ?? res);
  },
};
