import axios from 'axios';

import { api, refreshCsrfToken } from '@/lib/api';
import type {
  AddressSuggestion,
  CreateAddressPayload,
  GeocodeResult,
  SavedAddress,
  UpdateAddressPayload,
} from '@/lib/address/types';
import { toAddressLabelEnum } from '@/lib/address/types';

const ADDRESS_SERVICE = '/api/v1/address-service';
const ADDRESS_BASE = `${ADDRESS_SERVICE}/addresses`;

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function extractError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Network request failed. Check your internet and try again.';
    }
    const data = error.response.data as
      | { message?: string; error?: string }
      | undefined;
    return (
      data?.message ||
      data?.error ||
      `Request failed (${error.response.status})`
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    params?: Record<string, string | number | undefined>;
  } = {}
): Promise<Envelope<T>> {
  const { method = 'GET', body, params } = options;
  const isMutating = method !== 'GET';

  try {
    if (isMutating) {
      await refreshCsrfToken();
    }

    const response = await api.request<Envelope<T> | T>({
      url: path,
      method,
      data: isMutating ? (body ?? {}) : body,
      params,
      withCredentials: true,
      headers: isMutating
        ? {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }
        : { Accept: 'application/json' },
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
    throw new Error(extractError(error, 'Address request failed'));
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
    record.addresses ??
    record.items ??
    record.results ??
    record.docs ??
    record.list ??
    record.data ??
    [];
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  if (nested && typeof nested === 'object') return extractList(nested);
  return [];
}

function readCoords(raw: Record<string, unknown>): { lat: number; lng: number } {
  const location = asRecord(raw.location ?? raw.coordinates ?? raw.geo);
  const nestedLoc = asRecord(location.location);

  let lat = Number(
    raw.lat ??
    raw.latitude ??
    location.lat ??
    location.latitude ??
    nestedLoc.lat
  );
  let lng = Number(
    raw.lng ??
    raw.longitude ??
    location.lng ??
    location.longitude ??
    nestedLoc.lng
  );

  const coords =
    (Array.isArray(raw.coordinates) ? raw.coordinates : null) ||
    (Array.isArray(location.coordinates) ? location.coordinates : null);

  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && coords) {
    // GeoJSON [lng, lat]
    lng = Number(coords[0]);
    lat = Number(coords[1]);
  }

  return {
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
  };
}

export function mapSavedAddress(raw: Record<string, unknown>): SavedAddress {
  const { lat, lng } = readCoords(raw);
  const addressObj = asRecord(raw.address);

  return {
    id: String(raw._id ?? raw.id ?? ''),
    label: toAddressLabelEnum(
      String(raw.label ?? raw.tag ?? raw.type ?? addressObj.label ?? 'home')
    ),
    formattedAddress: String(
      raw.formattedAddress ??
      raw.formatted_address ??
      raw.fullAddress ??
      raw.addressLine ??
      (typeof raw.address === 'string' ? raw.address : '') ??
      addressObj.formattedAddress ??
      ''
    ),
    street:
      (raw.street as string) ||
      (raw.addressLine1 as string) ||
      (addressObj.street as string) ||
      undefined,
    area:
      (raw.area as string) ||
      (raw.locality as string) ||
      (addressObj.area as string) ||
      undefined,
    city:
      (raw.city as string) ||
      (addressObj.city as string) ||
      undefined,
    state:
      (raw.state as string) ||
      (addressObj.state as string) ||
      undefined,
    pincode: String(
      raw.pincode ??
      raw.postalCode ??
      raw.zip ??
      addressObj.pincode ??
      ''
    ).trim() || undefined,
    landmark:
      (raw.landmark as string) ||
      (raw.nearby as string) ||
      undefined,
    contactName:
      (raw.contactName as string) ||
      (raw.name as string) ||
      (raw.receiverName as string) ||
      undefined,
    contactPhone:
      (raw.contactPhone as string) ||
      (raw.phone as string) ||
      (raw.mobile as string) ||
      undefined,
    lat,
    lng,
    isDefault: Boolean(
      raw.isDefault ?? raw.default ?? raw.is_default ?? false
    ),
    createdAt: (raw.createdAt as string) || undefined,
    updatedAt: (raw.updatedAt as string) || undefined,
  };
}

function mapSuggestion(item: Record<string, unknown>): AddressSuggestion {
  const structured = item.structured_formatting as
    | Record<string, unknown>
    | undefined;
  const mainText = String(
    item.description ??
    item.label ??
    item.text ??
    item.formattedAddress ??
    item.formatted_address ??
    item.mainText ??
    item.main_text ??
    structured?.main_text ??
    ''
  );
  const secondary = String(
    item.secondaryText ??
    item.secondary_text ??
    structured?.secondary_text ??
    ''
  );
  const description =
    mainText && secondary && !mainText.includes(secondary)
      ? `${mainText}, ${secondary}`
      : mainText || secondary;

  const placeId =
    (item.placeId as string) ||
    (item.place_id as string) ||
    (item.id as string) ||
    undefined;

  return { description, placeId, ...item };
}

function normalizeSuggestions(payload: unknown): AddressSuggestion[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => mapSuggestion(item as Record<string, unknown>));
  }
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  const list =
    record.suggestions ??
    record.predictions ??
    record.results ??
    record.items ??
    record.addresses ??
    [];

  if (!Array.isArray(list)) return [];
  return list.map((item) => mapSuggestion(item as Record<string, unknown>));
}

function toApiBody(payload: CreateAddressPayload | UpdateAddressPayload) {
  const label =
    payload.label != null ? toAddressLabelEnum(payload.label) : undefined;

  return {
    ...payload,
    label,
    tag: label,
    type: label,
    formatted_address: payload.formattedAddress,
    fullAddress: payload.formattedAddress,
    addressLine1: payload.street,
    locality: payload.area,
    postalCode: payload.pincode,
    zip: payload.pincode,
    phone: payload.contactPhone,
    mobile: payload.contactPhone,
    name: payload.contactName,
    receiverName: payload.contactName,
    latitude: payload.lat,
    longitude: payload.lng,
    location:
      payload.lat != null && payload.lng != null
        ? {
          type: 'Point',
          coordinates: [payload.lng, payload.lat],
          lat: payload.lat,
          lng: payload.lng,
        }
        : undefined,
    isDefault: payload.setAsDefault,
    setAsDefault: payload.setAsDefault,
  };
}

export const addressApi = {
  /** GET /health */
  health: async (): Promise<{ ok: boolean; service?: string }> => {
    try {
      const res = await request<{ service?: string } | undefined>(
        `${ADDRESS_SERVICE}/health`
      );
      return {
        ok: res.success !== false,
        service:
          (res.data as { service?: string } | undefined)?.service ||
          (asRecord(res.data).service as string | undefined),
      };
    } catch {
      return { ok: false };
    }
  },

  /** GET /addresses/autocomplete */
  autocomplete: async (query: string): Promise<AddressSuggestion[]> => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      await refreshCsrfToken();
      const res = await api.get<Envelope<unknown>>(`${ADDRESS_BASE}/autocomplete`, {
        params: { query: trimmed, input: trimmed, q: trimmed },
        withCredentials: true,
      });
      const payload = res.data?.data ?? res.data;
      return normalizeSuggestions(payload).filter((s) => s.description.trim());
    } catch (error) {
      throw new Error(extractError(error, 'Failed to load address suggestions'));
    }
  },

  /** POST /addresses/geocode */
  geocode: async (input: {
    placeId?: string;
    address?: string;
  }): Promise<GeocodeResult> => {
    try {
      await refreshCsrfToken();
      const res = await api.post<Envelope<Record<string, unknown>>>(
        `${ADDRESS_BASE}/geocode`,
        {
          placeId: input.placeId,
          place_id: input.placeId,
          address: input.address,
          query: input.address,
        },
        { withCredentials: true }
      );
      const data = (res.data?.data ?? res.data) as Record<string, unknown>;
      const { lat, lng } = readCoords(data);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) {
        throw new Error('Could not detect location for this address');
      }

      return {
        lat,
        lng,
        formattedAddress: String(
          data.formattedAddress ?? data.formatted_address ?? ''
        ),
      };
    } catch (error) {
      throw new Error(extractError(error, 'Failed to detect location'));
    }
  },

  /** POST /addresses/reverse-geocode */
  reverseGeocode: async (input: {
    lat: number;
    lng: number;
  }): Promise<string | null> => {
    try {
      await refreshCsrfToken();
      const res = await api.post<Envelope<Record<string, unknown>>>(
        `${ADDRESS_BASE}/reverse-geocode`,
        {
          lat: input.lat,
          lng: input.lng,
          latitude: input.lat,
          longitude: input.lng,
          coordinates: [input.lng, input.lat],
        },
        { withCredentials: true }
      );
      const data = (res.data?.data ?? res.data) as Record<string, unknown>;
      const formatted =
        (data.formattedAddress as string) ||
        (data.formatted_address as string) ||
        (data.address as string) ||
        (data.displayName as string) ||
        (data.display_name as string);
      return formatted ? String(formatted) : null;
    } catch {
      return null;
    }
  },

  /** GET /addresses */
  list: async (): Promise<SavedAddress[]> => {
    const res = await request<unknown>(ADDRESS_BASE);
    return extractList(res.data)
      .map(mapSavedAddress)
      .filter((a) => a.id)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  },

  /** GET /addresses/:addressId */
  getById: async (addressId: string): Promise<SavedAddress> => {
    const res = await request<unknown>(`${ADDRESS_BASE}/${addressId}`);
    const raw = Array.isArray(res.data)
      ? (res.data[0] as Record<string, unknown>)
      : asRecord(res.data);
    const mapped = mapSavedAddress(raw);
    if (!mapped.id) throw new Error('Address not found');
    return mapped;
  },

  /** POST /addresses */
  create: async (payload: CreateAddressPayload): Promise<SavedAddress> => {
    const res = await request<unknown>(ADDRESS_BASE, {
      method: 'POST',
      body: toApiBody(payload),
    });
    const mapped = mapSavedAddress(asRecord(res.data));
    if (!mapped.id) {
      // Some APIs return { address: {...} }
      const nested = mapSavedAddress(asRecord(asRecord(res.data).address));
      if (nested.id) return nested;
      throw new Error(res.message || 'Failed to save address');
    }
    return mapped;
  },

  /** PUT /addresses/:addressId */
  update: async (
    addressId: string,
    payload: UpdateAddressPayload
  ): Promise<SavedAddress> => {
    const res = await request<unknown>(`${ADDRESS_BASE}/${addressId}`, {
      method: 'PUT',
      body: toApiBody(payload),
    });
    const mapped = mapSavedAddress(asRecord(res.data));
    if (!mapped.id) {
      const nested = mapSavedAddress(asRecord(asRecord(res.data).address));
      if (nested.id) return nested;
      // Fall back to refetch-friendly stub
      return { ...mapSavedAddress({ ...payload, _id: addressId }), id: addressId };
    }
    return mapped;
  },

  /** DELETE /addresses/:addressId */
  remove: async (addressId: string): Promise<void> => {
    await request(`${ADDRESS_BASE}/${addressId}`, { method: 'DELETE' });
  },

  /** PUT /addresses/:addressId/default */
  setDefault: async (addressId: string): Promise<SavedAddress> => {
    const res = await request<unknown>(`${ADDRESS_BASE}/${addressId}/default`, {
      method: 'PUT',
      body: {},
    });
    const mapped = mapSavedAddress(asRecord(res.data));
    if (mapped.id) return mapped;
    return {
      id: addressId,
      label: 'home',
      formattedAddress: '',
      lat: 0,
      lng: 0,
      isDefault: true,
    };
  },
};

// Re-export types used by search.ts / google-places consumers.
export type { AddressSuggestion, GeocodeResult } from '@/lib/address/types';
