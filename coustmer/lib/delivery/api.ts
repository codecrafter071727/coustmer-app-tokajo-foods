/**
 * Delivery Service — all customer-facing APIs.
 * Gateway prefix: /api/v1/delivery-service
 *
 * §10 CUSTOMER_APP_ALL_APIS.md — 26 endpoints.
 */

import axios from 'axios';

import { api } from '@/lib/api';
import type {
  AddressChangePayload,
  ChatMessage,
  City,
  ContactlessPayload,
  DeliveryInstructionsPayload,
  DeliveryPartner,
  DropOtp,
  LiveLocation,
  OrderTracker,
  RatePartnerPayload,
  SendChatPayload,
  ShareLink,
  SurgeStatus,
  TrackingEta,
  TrackingRoute,
  TrackingTipPayload,
  Zone,
  ZoneDetail,
} from '@/lib/delivery/types';

const DS = '/api/v1/delivery-service';
const TRACKING = `${DS}/tracking/order`;

type Envelope<T> = { success?: boolean; message?: string; data?: T };

async function get<T>(path: string): Promise<T> {
  try {
    const res = await api.get<Envelope<T> | T>(path, {
      withCredentials: true,
      headers: { Accept: 'application/json' },
      timeout: 15_000,
    });
    const payload = res.data as Envelope<T> | T;
    if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
      const env = payload as Envelope<T>;
      if (env.success === false) throw apiError(env.message, 404);
      return env.data as T;
    }
    return payload as T;
  } catch (err) {
    throw normaliseError(err);
  }
}

async function mutate<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  try {
    const res = await api.request<Envelope<T> | T>({
      url: path,
      method,
      data: body ?? {},
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...extraHeaders,
      },
      timeout: 15_000,
    });
    const payload = res.data as Envelope<T> | T;
    if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
      return (payload as Envelope<T>).data as T;
    }
    return payload as T;
  } catch (err) {
    throw normaliseError(err);
  }
}

function apiError(msg?: string, status?: number): Error & { status?: number } {
  const e = new Error(msg || 'Delivery service error') as Error & { status?: number };
  e.status = status;
  return e;
}

function normaliseError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    if (!err.response) return new Error('Network error. Check your connection.');
    const d = err.response.data as { message?: string; error?: string } | undefined;
    const msg = d?.message || d?.error || `Request failed (${err.response.status})`;
    const e = new Error(msg) as Error & { status?: number };
    e.status = err.response.status;
    return e;
  }
  return err instanceof Error ? err : new Error(String(err));
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function mapDeliveryPartner(raw: unknown): DeliveryPartner | null {
  const r = asRecord(raw);
  const nested = asRecord(
    r.partner ?? r.deliveryPartner ?? r.rider ?? r.driver ?? r
  );
  const id = String(nested._id ?? nested.id ?? r.partnerId ?? '');
  const name = String(
    nested.name ??
      nested.fullName ??
      nested.displayName ??
      [nested.firstName, nested.lastName].filter(Boolean).join(' ') ??
      ''
  ).trim();
  const phone = String(nested.phone ?? nested.mobile ?? nested.phoneNumber ?? '').trim();
  if (!name && !phone && !id) return null;

  const loc = asRecord(nested.currentLocation ?? nested.location ?? {});
  const coords = Array.isArray(loc.coordinates) ? (loc.coordinates as number[]) : undefined;
  return {
    id: id || phone || name,
    name: name || 'Delivery partner',
    phone,
    email: (nested.email as string) || undefined,
    vehicleType: mapVehicle(nested.vehicleType ?? nested.vehicle ?? nested.vehicleCategory),
    vehicleNumber: String(
      nested.vehicleNumber ?? nested.vehicleNo ?? nested.plateNumber ?? nested.registrationNumber ?? ''
    ),
    rating:
      typeof nested.rating === 'number'
        ? nested.rating
        : typeof nested.avgRating === 'number'
          ? nested.avgRating
          : Number(nested.rating) || 0,
    totalDeliveries: Number(nested.totalDeliveries ?? nested.deliveriesCount ?? 0) || 0,
    imageUrl:
      (nested.imageUrl as string) || (nested.photoUrl as string) || (nested.avatar as string) || undefined,
    isOnline: nested.isOnline !== undefined ? Boolean(nested.isOnline) : true,
    currentLocation:
      typeof loc.lat === 'number' || (Array.isArray(coords) && coords.length >= 2)
        ? {
            lat: typeof loc.lat === 'number' ? loc.lat : Number(coords![1]),
            lng: typeof loc.lng === 'number' ? loc.lng : Number(coords![0]),
            accuracy: typeof loc.accuracy === 'number' ? loc.accuracy : undefined,
            heading: typeof loc.heading === 'number' ? loc.heading : undefined,
            lastUpdate: String(loc.lastUpdate ?? loc.updatedAt ?? new Date().toISOString()),
          }
        : undefined,
  };
}

function mapVehicle(raw: unknown): DeliveryPartner['vehicleType'] {
  const v = String(raw ?? '').toLowerCase();
  if (v.includes('scooter')) return 'scooter';
  if (v.includes('bicycle') || v.includes('cycle')) return 'bicycle';
  if (v.includes('car') || v.includes('auto')) return 'car';
  return 'bike';
}

function mapTracker(raw: unknown, orderId: string): OrderTracker {
  const r = asRecord(raw);
  const partner = r.deliveryPartner ?? r.partner ?? r.rider;
  const partnerMapped = partner ? mapDeliveryPartner(partner) : undefined;

  const restLoc = asRecord(r.restaurantLocation ?? r.pickupLocation ?? {});
  const custLoc = asRecord(r.customerLocation ?? r.dropLocation ?? r.deliveryLocation ?? {});

  const restCoords = Array.isArray(restLoc.coordinates) ? (restLoc.coordinates as number[]) : undefined;
  const custCoords = Array.isArray(custLoc.coordinates) ? (custLoc.coordinates as number[]) : undefined;

  return {
    orderId: String(r.orderId ?? orderId),
    deliveryId: (r.deliveryId as string) || (r._id as string) || undefined,
    status: (r.status as string) || undefined,
    orderStatus: (r.orderStatus as string) || undefined,
    etaMinutes: typeof r.etaMinutes === 'number' ? r.etaMinutes : Number(r.etaMins ?? r.eta) || undefined,
    etaText: (r.etaText as string) || (r.estimatedArrival as string) || undefined,
    partner: partnerMapped ?? undefined,
    restaurantLat:
      typeof restLoc.lat === 'number' ? restLoc.lat : restCoords ? Number(restCoords[1]) : undefined,
    restaurantLng:
      typeof restLoc.lng === 'number' ? restLoc.lng : restCoords ? Number(restCoords[0]) : undefined,
    customerLat:
      typeof custLoc.lat === 'number' ? custLoc.lat : custCoords ? Number(custCoords[1]) : undefined,
    customerLng:
      typeof custLoc.lng === 'number' ? custLoc.lng : custCoords ? Number(custCoords[0]) : undefined,
    routePolyline: (r.routePolyline as string) || (r.polyline as string) || undefined,
    timeline: Array.isArray(r.timeline)
      ? (r.timeline as OrderTracker['timeline'])
      : Array.isArray(r.statusHistory)
        ? (r.statusHistory as OrderTracker['timeline'])
        : undefined,
    shareToken: (r.shareToken as string) || undefined,
    dropOtp: (r.dropOtp as string) || (r.otp as string) || undefined,
    raw: r,
  };
}

function mapChat(raw: unknown, orderId: string): ChatMessage {
  const r = asRecord(raw);
  return {
    id: String(r._id ?? r.id ?? ''),
    orderId: String(r.orderId ?? orderId),
    from: (r.senderRole as ChatMessage['from']) === 'partner' ? 'partner' : 'customer',
    text: String(r.text ?? r.message ?? r.content ?? ''),
    sentAt: String(r.sentAt ?? r.createdAt ?? new Date().toISOString()),
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const deliveryApi = {
  // ── Cities & zones (public) ────────────────────────────────────────────────

  /** GET /public/cities — launch city list */
  getCities: async (): Promise<City[]> => {
    const raw = await get<unknown>(`${DS}/public/cities`);
    const list = Array.isArray(raw) ? raw : Array.isArray(asRecord(raw).cities) ? asRecord(raw).cities as unknown[] : [];
    return (list as unknown[]).map((c) => {
      const r = asRecord(c);
      return {
        id: String(r._id ?? r.id ?? ''),
        name: String(r.name ?? r.city ?? ''),
        slug: (r.slug as string) || undefined,
        lat: typeof r.lat === 'number' ? r.lat : undefined,
        lng: typeof r.lng === 'number' ? r.lng : undefined,
        isActive: r.isActive !== undefined ? Boolean(r.isActive) : true,
      };
    });
  },

  /** GET /zones */
  getZones: async (): Promise<Zone[]> => {
    const raw = await get<unknown>(`${DS}/zones`);
    const list = Array.isArray(raw) ? raw : Array.isArray(asRecord(raw).zones) ? asRecord(raw).zones as unknown[] : [];
    return (list as unknown[]).map((z) => {
      const r = asRecord(z);
      return {
        id: String(r._id ?? r.id ?? ''),
        name: String(r.name ?? ''),
        cityId: (r.cityId as string) || undefined,
        isActive: r.isActive !== undefined ? Boolean(r.isActive) : true,
      };
    });
  },

  /** GET /zones/:zoneId */
  getZone: async (zoneId: string): Promise<ZoneDetail> => {
    const raw = await get<unknown>(`${DS}/zones/${zoneId}`);
    const r = asRecord(raw);
    const polygon = Array.isArray(r.polygon) ? (r.polygon as [number, number][]) : undefined;
    const center = asRecord(r.center ?? r.centerPoint ?? {});
    return {
      id: String(r._id ?? r.id ?? zoneId),
      name: String(r.name ?? ''),
      cityId: (r.cityId as string) || undefined,
      isActive: r.isActive !== undefined ? Boolean(r.isActive) : true,
      polygon,
      centerLat: typeof center.lat === 'number' ? center.lat : typeof r.centerLat === 'number' ? r.centerLat : undefined,
      centerLng: typeof center.lng === 'number' ? center.lng : typeof r.centerLng === 'number' ? r.centerLng : undefined,
      radiusKm: typeof r.radiusKm === 'number' ? r.radiusKm : undefined,
      openTime: (r.openTime as string) || (r.opens as string) || undefined,
      closeTime: (r.closeTime as string) || (r.closes as string) || undefined,
      description: (r.description as string) || undefined,
    };
  },

  /** GET /zones/:zoneId/surge-status */
  getSurgeStatus: async (zoneId: string): Promise<SurgeStatus> => {
    const raw = await get<unknown>(`${DS}/zones/${zoneId}/surge-status`);
    const r = asRecord(raw);
    return {
      zoneId,
      isSurge: Boolean(r.isSurge ?? r.surge ?? false),
      multiplier: typeof r.multiplier === 'number' ? r.multiplier : undefined,
      label: (r.label as string) || undefined,
    };
  },

  // ── Tracking ───────────────────────────────────────────────────────────────

  /** GET /tracking/order/:orderId — full tracker DTO */
  getTracking: async (orderId: string): Promise<OrderTracker> => {
    const raw = await get<unknown>(`${TRACKING}/${orderId}`);
    return mapTracker(raw, orderId);
  },

  /** GET /tracking/order/:orderId/location — live GPS (~5s poll) */
  getLiveLocation: async (orderId: string): Promise<LiveLocation | null> => {
    try {
      let raw: unknown;
      try {
        raw = await get<unknown>(`${TRACKING}/${orderId}/location`);
      } catch {
        // Alias support: /tracking/live-location/:orderId
        raw = await get<unknown>(`${DS}/tracking/live-location/${orderId}`);
      }
      const r = asRecord(raw);
      const loc = asRecord(r.location ?? r.currentLocation ?? r);
      const coords = Array.isArray(loc.coordinates) ? (loc.coordinates as number[]) : undefined;
      const lat = typeof loc.lat === 'number' ? loc.lat : coords ? Number(coords[1]) : undefined;
      const lng = typeof loc.lng === 'number' ? loc.lng : coords ? Number(coords[0]) : undefined;
      if (!lat || !lng) return null;
      return {
        lat,
        lng,
        heading: typeof loc.heading === 'number' ? loc.heading : undefined,
        accuracy: typeof loc.accuracy === 'number' ? loc.accuracy : undefined,
        speed: typeof loc.speed === 'number' ? loc.speed : undefined,
        updatedAt: (loc.updatedAt as string) || (loc.lastUpdate as string) || undefined,
      };
    } catch {
      return null;
    }
  },

  /** GET /tracking/order/:orderId/eta */
  getEta: async (orderId: string): Promise<TrackingEta> => {
    let raw: unknown;
    try {
      raw = await get<unknown>(`${TRACKING}/${orderId}/eta`);
    } catch {
      // Alias support: /tracking/eta/:orderId
      raw = await get<unknown>(`${DS}/tracking/eta/${orderId}`);
    }
    const r = asRecord(raw);
    return {
      etaMinutes: typeof r.etaMinutes === 'number' ? r.etaMinutes : Number(r.etaMins ?? r.eta) || undefined,
      etaText: (r.etaText as string) || undefined,
      distanceKm: typeof r.distanceKm === 'number' ? r.distanceKm : undefined,
    };
  },

  /** GET /tracking/order/:orderId/route */
  getRoute: async (orderId: string): Promise<TrackingRoute> => {
    let raw: unknown;
    try {
      raw = await get<unknown>(`${TRACKING}/${orderId}/route`);
    } catch {
      // Alias support: /tracking/route/:orderId
      raw = await get<unknown>(`${DS}/tracking/route/${orderId}`);
    }
    const r = asRecord(raw);
    return {
      polyline: (r.polyline as string) || (r.overviewPolyline as string) || undefined,
      coordinates: Array.isArray(r.coordinates) ? (r.coordinates as [number, number][]) : undefined,
      distanceMeters: typeof r.distanceMeters === 'number' ? r.distanceMeters : undefined,
      durationSeconds: typeof r.durationSeconds === 'number' ? r.durationSeconds : undefined,
    };
  },

  /** GET /tracking/order/:orderId/partner — masked rider */
  getOrderPartner: async (orderId: string): Promise<DeliveryPartner | null> => {
    if (!orderId) return null;
    try {
      const raw = await get<unknown>(`${TRACKING}/${orderId}/partner`);
      return mapDeliveryPartner(raw);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (status === 404 || msg.includes('not found') || msg.includes('not assigned')) return null;
      throw err;
    }
  },

  /** GET /tracking/order/:orderId/otp — drop OTP */
  getDropOtp: async (orderId: string): Promise<DropOtp | null> => {
    try {
      const raw = await get<unknown>(`${TRACKING}/${orderId}/otp`);
      const r = asRecord(raw);
      const otp = String(r.otp ?? r.dropOtp ?? r.code ?? '');
      if (!otp) return null;
      return { otp, expiresAt: (r.expiresAt as string) || undefined };
    } catch {
      return null;
    }
  },

  /** GET /tracking/order/:orderId/chat */
  getChatHistory: async (orderId: string): Promise<ChatMessage[]> => {
    const raw = await get<unknown>(`${TRACKING}/${orderId}/chat`);
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(asRecord(raw).messages)
        ? (asRecord(raw).messages as unknown[])
        : [];
    return (list as unknown[]).map((m) => mapChat(m, orderId));
  },

  /** POST /tracking/order/:orderId/chat */
  sendChat: async (orderId: string, payload: SendChatPayload): Promise<ChatMessage> => {
    const raw = await mutate<unknown>('POST', `${TRACKING}/${orderId}/chat`, {
      text: payload.text,
      message: payload.text,
    });
    return mapChat(asRecord(raw), orderId);
  },

  /** POST /tracking/order/:orderId/share — family share link */
  createShareLink: async (orderId: string): Promise<ShareLink> => {
    const raw = await mutate<unknown>('POST', `${TRACKING}/${orderId}/share`, {});
    const r = asRecord(raw);
    return {
      shareToken: String(r.shareToken ?? r.token ?? ''),
      url: String(r.url ?? r.shareUrl ?? ''),
      expiresAt: (r.expiresAt as string) || undefined,
    };
  },

  /** DELETE /tracking/order/:orderId/share */
  revokeShareLink: async (orderId: string): Promise<void> => {
    await mutate<unknown>('DELETE', `${TRACKING}/${orderId}/share`);
  },

  /** GET /tracking/share/:shareToken — public live track (no auth) */
  getPublicShare: async (shareToken: string): Promise<OrderTracker> => {
    const raw = await get<unknown>(`${DS}/tracking/share/${shareToken}`);
    return mapTracker(raw, '');
  },

  /** POST /tracking/order/:orderId/nudge-partner */
  nudgePartner: async (orderId: string): Promise<void> => {
    await mutate<unknown>('POST', `${TRACKING}/${orderId}/nudge-partner`, {});
  },

  /** POST /tracking/order/:orderId/contact-partner */
  contactPartner: async (orderId: string): Promise<{ callId?: string; maskedPhone?: string }> => {
    const raw = await mutate<unknown>('POST', `${TRACKING}/${orderId}/contact-partner`, {});
    const r = asRecord(raw);
    return {
      callId: (r.callId as string) || undefined,
      maskedPhone: (r.maskedPhone as string) || (r.phone as string) || undefined,
    };
  },

  /** POST /tracking/order/:orderId/contact-support */
  contactSupport: async (orderId: string, reason?: string): Promise<void> => {
    await mutate<unknown>('POST', `${TRACKING}/${orderId}/contact-support`, { reason: reason ?? '' });
  },

  /** PUT /tracking/order/:orderId/delivery-instructions */
  setDeliveryInstructions: async (
    orderId: string,
    payload: DeliveryInstructionsPayload
  ): Promise<void> => {
    await mutate<unknown>('PUT', `${TRACKING}/${orderId}/delivery-instructions`, payload);
  },

  /** PUT /tracking/order/:orderId/contactless */
  setContactless: async (orderId: string, payload: ContactlessPayload): Promise<void> => {
    await mutate<unknown>('PUT', `${TRACKING}/${orderId}/contactless`, payload);
  },

  /** PUT /tracking/order/:orderId/address-change — pre-pickup only */
  changeAddress: async (orderId: string, payload: AddressChangePayload): Promise<void> => {
    await mutate<unknown>('PUT', `${TRACKING}/${orderId}/address-change`, payload);
  },

  /** POST /tracking/order/:orderId/tip — in-flight tip (Idempotency-Key required) */
  addTip: async (orderId: string, payload: TrackingTipPayload): Promise<void> => {
    const key = payload.idempotencyKey ?? `tip-${orderId}-${Date.now()}`;
    await mutate<unknown>('POST', `${TRACKING}/${orderId}/tip`, { tip: payload.tip, amount: payload.tip }, {
      'Idempotency-Key': key,
    });
  },

  /** POST /tracking/order/:orderId/rate-partner */
  ratePartner: async (orderId: string, payload: RatePartnerPayload): Promise<void> => {
    await mutate<unknown>('POST', `${TRACKING}/${orderId}/rate-partner`, payload);
  },
};
