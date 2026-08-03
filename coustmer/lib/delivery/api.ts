/**
 * Delivery Service – customer-facing partner lookup.
 * Gateway: /api/v1/delivery-service
 *
 * GET /restaurant/orders/:orderId/partner
 *   Assigned delivery partner for an order (name, phone, vehicle, rating…).
 */

import axios from 'axios';

import { api } from '@/lib/api';
import type { DeliveryPartner } from '@/lib/delivery/types';

const DELIVERY_SERVICE = '/api/v1/delivery-service';

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

async function request<T>(path: string): Promise<Envelope<T>> {
  try {
    const response = await api.get<Envelope<T> | T>(path, {
      withCredentials: true,
      headers: { Accept: 'application/json' },
      timeout: 12_000,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status >= 400) {
      const data = response.data as
        | { message?: string; error?: string }
        | undefined;
      const err = new Error(
        data?.message || data?.error || `Request failed (${response.status})`
      ) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    const payload = response.data as Envelope<T> | T;
    if (
      payload &&
      typeof payload === 'object' &&
      ('data' in (payload as object) || 'success' in (payload as object))
    ) {
      const envelope = payload as Envelope<T>;
      if (envelope.success === false) {
        const err = new Error(
          envelope.message || 'Delivery service unavailable'
        ) as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      return envelope;
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
      const err = new Error(
        data?.message ||
          data?.error ||
          `Request failed (${error.response.status})`
      ) as Error & { status?: number };
      err.status = error.response.status;
      throw err;
    }
    throw error;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function mapVehicleType(raw: unknown): DeliveryPartner['vehicleType'] {
  const v = String(raw ?? '').toLowerCase();
  if (v.includes('scooter')) return 'scooter';
  if (v.includes('bicycle') || v.includes('cycle')) return 'bicycle';
  if (v.includes('car') || v.includes('auto')) return 'car';
  return 'bike';
}

export function mapDeliveryPartner(raw: unknown): DeliveryPartner | null {
  const record = asRecord(raw);
  const nested = asRecord(
    record.partner ??
      record.deliveryPartner ??
      record.rider ??
      record.driver ??
      record
  );

  const id = String(nested._id ?? nested.id ?? record.partnerId ?? '');
  const name = String(
    nested.name ??
      nested.fullName ??
      nested.displayName ??
      [nested.firstName, nested.lastName].filter(Boolean).join(' ') ??
      ''
  ).trim();
  const phone = String(
    nested.phone ?? nested.mobile ?? nested.phoneNumber ?? ''
  ).trim();

  if (!name && !phone && !id) return null;

  const loc = asRecord(nested.currentLocation ?? nested.location ?? {});
  const coords = Array.isArray(loc.coordinates)
    ? (loc.coordinates as number[])
    : undefined;

  return {
    id: id || phone || name,
    name: name || 'Delivery partner',
    phone,
    email: (nested.email as string) || undefined,
    vehicleType: mapVehicleType(
      nested.vehicleType ?? nested.vehicle ?? nested.vehicleCategory
    ),
    vehicleNumber: String(
      nested.vehicleNumber ??
        nested.vehicleNo ??
        nested.plateNumber ??
        nested.registrationNumber ??
        ''
    ),
    rating:
      typeof nested.rating === 'number'
        ? nested.rating
        : typeof nested.avgRating === 'number'
          ? nested.avgRating
          : Number(nested.rating) || 0,
    totalDeliveries:
      Number(
        nested.totalDeliveries ??
          nested.deliveriesCount ??
          nested.completedDeliveries ??
          0
      ) || 0,
    imageUrl:
      (nested.imageUrl as string) ||
      (nested.photoUrl as string) ||
      (nested.avatar as string) ||
      (nested.profilePhoto as string) ||
      undefined,
    isOnline: nested.isOnline !== undefined ? Boolean(nested.isOnline) : true,
    currentLocation:
      typeof loc.lat === 'number' ||
      typeof loc.lng === 'number' ||
      (Array.isArray(coords) && coords.length >= 2)
        ? {
            lat:
              typeof loc.lat === 'number'
                ? loc.lat
                : Array.isArray(coords)
                  ? Number(coords[1])
                  : 0,
            lng:
              typeof loc.lng === 'number'
                ? loc.lng
                : Array.isArray(coords)
                  ? Number(coords[0])
                  : 0,
            accuracy:
              typeof loc.accuracy === 'number' ? loc.accuracy : undefined,
            heading: typeof loc.heading === 'number' ? loc.heading : undefined,
            lastUpdate: String(
              loc.lastUpdate ?? loc.updatedAt ?? new Date().toISOString()
            ),
          }
        : undefined,
  };
}

function isNotAssignedError(error: unknown): boolean {
  const status = (error as Error & { status?: number }).status;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    status === 404 ||
    message.includes('no delivery') ||
    message.includes('not found') ||
    message.includes('not assigned') ||
    message.includes('no partner')
  );
}

export const deliveryApi = {
  /**
   * GET /restaurant/orders/:orderId/partner
   * Returns null when no partner is assigned yet.
   */
  getOrderPartner: async (
    orderId: string
  ): Promise<DeliveryPartner | null> => {
    if (!orderId) return null;
    try {
      const res = await request<unknown>(
        `${DELIVERY_SERVICE}/restaurant/orders/${orderId}/partner`
      );
      return mapDeliveryPartner(res.data);
    } catch (error) {
      if (isNotAssignedError(error)) return null;
      throw error;
    }
  },
};
