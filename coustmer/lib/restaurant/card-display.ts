import type { Restaurant } from '@/lib/restaurant/types';
import { getRestaurantRating } from '@/lib/restaurant/menu-rating';

/** Match restaurant-service DELIVERY_ETA for client-side estimates. */
const RIDER_SPEED_KMH = 22;
const ETA_BUFFER_MIN = 3;
const ETA_RANGE_PAD_MIN = 5;
const MIN_TRAVEL_KM = 0.2;

export function formatDistanceKm(km?: number): string | null {
  if (typeof km !== 'number' || !Number.isFinite(km) || km < 0) return null;
  if (km < 0.1) return 'Nearby';
  return `${km.toFixed(1)} km`;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Prefer API distance; else haversine from user pin → restaurant coords. */
export function resolveRestaurantDistanceKm(
  r: Restaurant,
  user?: { lat?: number; lng?: number } | null
): number | null {
  if (typeof r.distance === 'number' && Number.isFinite(r.distance) && r.distance >= 0) {
    return Math.round(r.distance * 10) / 10;
  }
  const uLat = user?.lat;
  const uLng = user?.lng;
  const rLat = r.lat;
  const rLng = r.lng;
  if (
    typeof uLat === 'number' &&
    typeof uLng === 'number' &&
    typeof rLat === 'number' &&
    typeof rLng === 'number' &&
    Number.isFinite(uLat) &&
    Number.isFinite(uLng) &&
    Number.isFinite(rLat) &&
    Number.isFinite(rLng)
  ) {
    return Math.round(haversineKm(uLat, uLng, rLat, rLng) * 10) / 10;
  }
  return null;
}

function prepMinutesFromRestaurant(r: Restaurant): number {
  const settings =
    r.settings && typeof r.settings === 'object'
      ? (r.settings as Record<string, unknown>)
      : undefined;
  const raw = Number(
    settings?.avgPrepTime ?? settings?.preparationTime ?? 0
  );
  if (Number.isFinite(raw) && raw > 0) return Math.round(raw);
  return 20;
}

/** Detail-page ETA: API label first, else estimate from live pin distance. */
export function restaurantDetailEtaLabel(
  r: Restaurant,
  distanceKm?: number | null
): string | undefined {
  const fromApi = restaurantEtaLabel(r);
  if (fromApi) return fromApi;

  if (
    typeof distanceKm !== 'number' ||
    !Number.isFinite(distanceKm) ||
    distanceKm < MIN_TRAVEL_KM
  ) {
    return undefined;
  }

  const travelMin = (distanceKm / RIDER_SPEED_KMH) * 60;
  const prep = prepMinutesFromRestaurant(r);
  const mid = Math.max(1, Math.round(prep + travelMin + ETA_BUFFER_MIN));
  const min = Math.max(
    prep > 0 ? Math.min(prep, mid) : 1,
    mid - ETA_RANGE_PAD_MIN
  );
  const max = mid + ETA_RANGE_PAD_MIN;
  const label = `${min}–${max} mins`;
  if (isPlaceholderListingEta(label)) return undefined;
  return label;
}

/** IST-friendly label for next open instant from nearby/detail APIs. */
export function formatNextOpenAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function restaurantIsClosed(r: Restaurant): boolean {
  return (
    r.isOpen === false || r.isOpenNow === false || r.isOnline === false
  );
}

/** Closed card copy: Opens at … → closedReason → generic. */
export function restaurantClosedLabel(r: Restaurant): string | null {
  if (!restaurantIsClosed(r)) return null;
  const next = formatNextOpenAt(r.nextOpenAt);
  if (next) return `Opens ${next}`;
  const reason = String(r.closedReason ?? '').trim();
  if (reason) return reason;
  return 'Currently closed';
}

/** Live card stars — never invent a rating. */
export function restaurantStars(r: Restaurant): number | undefined {
  return getRestaurantRating(r) ?? undefined;
}

export function restaurantRatingCount(r: Restaurant): number | undefined {
  const n = r.totalRatings ?? r.reviewCount;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Kitchen schema default (prep 30 + pad) — not a real door-to-door ETA. */
export function isPlaceholderListingEta(label?: string | null): boolean {
  if (!label) return false;
  return /^(25|30)\s*[–-]\s*(35|38)\s*mins?$/i.test(label.trim());
}

/** ETA from card DTO. Hide schema-default 30–38 and sub-200 m hops. */
export function restaurantEtaLabel(r: Restaurant): string | undefined {
  if (r.travelIncluded === false) return undefined;
  if (typeof r.distance === 'number' && r.distance >= 0 && r.distance < 0.2) {
    return undefined;
  }
  const label = r.deliveryTimeLabel?.trim() || r.deliveryTime?.trim();
  if (label) {
    if (isPlaceholderListingEta(label)) return undefined;
    return label;
  }
  if (typeof r.promiseMinutes === 'number' && r.promiseMinutes > 0) {
    return `${Math.round(r.promiseMinutes)} mins`;
  }
  return undefined;
}

/** Up to 2 live offer badges. Empty when the API has none. */
export function restaurantOfferBadges(r: Restaurant, max = 2): string[] {
  const fromDto = (r.offerBadges ?? [])
    .map((s) => String(s).trim())
    .filter(Boolean);
  if (fromDto.length) return fromDto.slice(0, max);
  const single = r.offer?.trim();
  return single ? [single] : [];
}
