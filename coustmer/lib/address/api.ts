import { api } from '@/lib/api';
import type {
  AutocompleteItem,
  CreateAddressPayload,
  GeocodeResult,
  ReverseGeocodeResult,
  SavedAddress,
  ServiceabilityResult,
  UpdateAddressPayload,
} from './types';
import { toAddressLabelEnum } from './types';

const BASE = '/api/v1/address-service';

type Envelope<T> = { success?: boolean; message?: string; data?: T };

function mapAddress(raw: Record<string, unknown>): SavedAddress {
  const loc = raw.location as { coordinates?: number[] } | undefined;
  return {
    id: String(raw._id ?? raw.id ?? ''),
    label: toAddressLabelEnum(raw.label as string),
    customLabel: (raw.customLabel as string) || undefined,
    flat: (raw.flat as string) || (raw.flatNo as string) || undefined,
    floor: (raw.floor as string) || undefined,
    landmark: (raw.landmark as string) || undefined,
    street: (raw.street as string) || undefined,
    area: (raw.area as string) || (raw.locality as string) || undefined,
    city: (raw.city as string) || undefined,
    state: (raw.state as string) || undefined,
    pincode: String(raw.pincode ?? raw.pinCode ?? raw.zip ?? '') || undefined,
    country: (raw.country as string) || undefined,
    formattedAddress:
      (raw.formattedAddress as string) ||
      (raw.fullAddress as string) ||
      (raw.address as string) ||
      undefined,
    lat: typeof raw.lat === 'number' ? raw.lat : (loc?.coordinates?.[1] ?? 0),
    lng: typeof raw.lng === 'number' ? raw.lng : (loc?.coordinates?.[0] ?? 0),
    isDefault: raw.isDefault === true,
    contactName: (raw.contactName as string) || undefined,
    contactPhone: (raw.contactPhone as string) || undefined,
    createdAt: (raw.createdAt as string) || undefined,
    updatedAt: (raw.updatedAt as string) || undefined,
  };
}

export const addressApi = {
  /** POST /addresses/geocode */
  geocode: async (query: string): Promise<GeocodeResult[]> => {
    const res = await api.post<Envelope<unknown>>(`${BASE}/addresses/geocode`, { query });
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    return rows.map((r: Record<string, unknown>) => ({
      lat: Number(r.lat ?? (r.location as { coordinates?: number[] })?.coordinates?.[1] ?? 0),
      lng: Number(r.lng ?? (r.location as { coordinates?: number[] })?.coordinates?.[0] ?? 0),
      formattedAddress: (r.formattedAddress as string) || (r.address as string) || undefined,
      street: (r.street as string) || undefined,
      area: (r.area as string) || undefined,
      city: (r.city as string) || undefined,
      state: (r.state as string) || undefined,
      pincode: String(r.pincode ?? '') || undefined,
      country: (r.country as string) || undefined,
    }));
  },

  /** POST /addresses/reverse-geocode */
  reverseGeocode: async (lat: number, lng: number): Promise<ReverseGeocodeResult> => {
    const res = await api.post<Envelope<Record<string, unknown>>>(`${BASE}/addresses/reverse-geocode`, { lat, lng });
    const r = res.data?.data ?? {};
    return {
      lat,
      lng,
      formattedAddress: (r.formattedAddress as string) || (r.address as string) || undefined,
      street: (r.street as string) || undefined,
      area: (r.area as string) || (r.locality as string) || undefined,
      city: (r.city as string) || undefined,
      state: (r.state as string) || undefined,
      pincode: String(r.pincode ?? '') || undefined,
      country: (r.country as string) || undefined,
    };
  },

  /** GET /addresses/autocomplete?q= */
  autocomplete: async (query: string): Promise<AutocompleteItem[]> => {
    const res = await api.get<Envelope<unknown>>(`${BASE}/addresses/autocomplete`, {
      params: { q: query },
    });
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    return rows.map((r: Record<string, unknown>) => ({
      placeId: String(r.placeId ?? r.place_id ?? r.id ?? ''),
      description: String(r.description ?? r.formattedAddress ?? ''),
      mainText: (r.mainText ?? r.main_text) as string | undefined,
      secondaryText: (r.secondaryText ?? r.secondary_text) as string | undefined,
    }));
  },

  /** GET /addresses/serviceability?lat=&lng= */
  checkServiceability: async (lat: number, lng: number): Promise<ServiceabilityResult> => {
    const res = await api.get<Envelope<Record<string, unknown>>>(`${BASE}/addresses/serviceability`, {
      params: { lat, lng },
    });
    const d = res.data?.data ?? {};
    return {
      serviceable: d.serviceable === true || d.isServiceable === true,
      city: (d.city as string) || undefined,
      zone: (d.zone as string) || (d.zoneName as string) || undefined,
      message: (d.message as string) || undefined,
    };
  },

  /** GET /addresses */
  listAddresses: async (): Promise<SavedAddress[]> => {
    const res = await api.get<Envelope<unknown>>(`${BASE}/addresses`);
    const rows = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray((res.data?.data as Record<string, unknown>)?.addresses)
        ? (res.data.data as Record<string, unknown>).addresses
        : [];
    return (rows as Record<string, unknown>[]).map(mapAddress);
  },

  /** POST /addresses */
  createAddress: async (payload: CreateAddressPayload): Promise<SavedAddress> => {
    const body = {
      tag: payload.label,
      label: payload.customLabel || payload.label,
      flatNo: payload.flat,
      landmark: payload.landmark,
      line1: payload.street,
      city: payload.city,
      state: payload.state,
      pinCode: payload.pincode,
      country: payload.country || 'India',
      formattedAddress: payload.formattedAddress,
      latitude: payload.lat,
      longitude: payload.lng,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      isDefault: false,
    };
    const res = await api.post<Envelope<Record<string, unknown>>>(`${BASE}/addresses`, body);
    return mapAddress(res.data?.data ?? (res.data as unknown as Record<string, unknown>));
  },

  /** GET /addresses/:id */
  getAddress: async (id: string): Promise<SavedAddress> => {
    const res = await api.get<Envelope<Record<string, unknown>>>(`${BASE}/addresses/${id}`);
    return mapAddress(res.data?.data ?? (res.data as unknown as Record<string, unknown>));
  },

  /** PUT /addresses/:id */
  updateAddress: async (id: string, payload: UpdateAddressPayload): Promise<SavedAddress> => {
    const body: Record<string, unknown> = {};
    if (payload.label) body.tag = payload.label;
    if (payload.customLabel) body.label = payload.customLabel;
    if (payload.flat) body.flatNo = payload.flat;
    if (payload.landmark) body.landmark = payload.landmark;
    if (payload.street) body.line1 = payload.street;
    if (payload.city) body.city = payload.city;
    if (payload.state) body.state = payload.state;
    if (payload.pincode) body.pinCode = payload.pincode;
    if (payload.country) body.country = payload.country;
    if (payload.formattedAddress) body.formattedAddress = payload.formattedAddress;
    if (payload.lat != null && payload.lng != null) {
      body.latitude = payload.lat;
      body.longitude = payload.lng;
    }
    if (payload.contactName) body.contactName = payload.contactName;
    if (payload.contactPhone) body.contactPhone = payload.contactPhone;
    const res = await api.put<Envelope<Record<string, unknown>>>(`${BASE}/addresses/${id}`, body);
    return mapAddress(res.data?.data ?? (res.data as unknown as Record<string, unknown>));
  },

  /** DELETE /addresses/:id */
  deleteAddress: async (id: string): Promise<void> => {
    await api.delete(`${BASE}/addresses/${id}`);
  },

  /** PUT /addresses/:id/default */
  setDefault: async (id: string): Promise<SavedAddress> => {
    const res = await api.put<Envelope<Record<string, unknown>>>(`${BASE}/addresses/${id}/default`, {});
    return mapAddress(res.data?.data ?? (res.data as unknown as Record<string, unknown>));
  },

  /** POST /addresses/:id/label */
  setLabel: async (id: string, label: string): Promise<SavedAddress> => {
    const res = await api.post<Envelope<Record<string, unknown>>>(`${BASE}/addresses/${id}/label`, { label });
    return mapAddress(res.data?.data ?? (res.data as unknown as Record<string, unknown>));
  },

  /** Alias for createAddress (used by home screen save-address flow) */
  create: async (payload: CreateAddressPayload & { setAsDefault?: boolean; displayLabel?: string }): Promise<SavedAddress> => {
    const body: Record<string, unknown> = {
      tag: payload.label || 'other',
      label: payload.customLabel || payload.label || 'other',
      city: payload.city || 'Unknown',
      state: payload.state || 'Unknown',
      country: payload.country || 'India',
      formattedAddress: payload.formattedAddress,
      latitude: payload.lat,
      longitude: payload.lng,
      isDefault: payload.setAsDefault ?? false,
    };
    if (payload.flat) body.flatNo = payload.flat;
    if (payload.landmark) body.landmark = payload.landmark;
    if (payload.street) body.line1 = payload.street;
    if (payload.pincode) body.pinCode = payload.pincode;
    if (payload.contactName) body.contactName = payload.contactName;
    if (payload.contactPhone) body.contactPhone = payload.contactPhone;
    const res = await api.post<Envelope<Record<string, unknown>>>(`${BASE}/addresses`, body);
    const saved = mapAddress(res.data?.data ?? (res.data as unknown as Record<string, unknown>));
    if (payload.setAsDefault && saved.id) {
      try {
        await api.put(`${BASE}/addresses/${saved.id}/default`, {});
      } catch { /* best effort */ }
    }
    return saved;
  },
};
