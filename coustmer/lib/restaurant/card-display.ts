import type { Restaurant } from '@/lib/restaurant/types';

/** Live card stars — never invent a rating. */
export function restaurantStars(r: Restaurant): number | undefined {
  const n = r.avgRating ?? r.rating;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined;
}

export function restaurantRatingCount(r: Restaurant): number | undefined {
  const n = r.totalRatings ?? r.reviewCount;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined;
}

/** ETA from card DTO. Never fake Maps traffic. */
export function restaurantEtaLabel(r: Restaurant): string | undefined {
  const label = r.deliveryTimeLabel?.trim() || r.deliveryTime?.trim();
  if (label) return label;
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
