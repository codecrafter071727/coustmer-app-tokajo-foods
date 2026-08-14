import type { HomeFilterState } from '@/lib/home/filters';
import type { NearbyParams, NearbySort } from '@/lib/restaurant/types';

/** Backend list/nearby sort enum — never send Mongo-style `-createdAt`. */
export function normalizeRestaurantSort(
  sort?: string | null
): NearbySort | undefined {
  const raw = String(sort ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return undefined;
  if (
    raw === 'newest' ||
    raw === '-createdat' ||
    raw === 'createdat' ||
    raw === 'created_at' ||
    raw === '-created_at'
  ) {
    return 'newest';
  }
  if (raw === 'relevance') return 'relevance';
  if (raw === 'delivery_time' || raw === 'fastest' || raw === 'nearest') {
    return 'delivery_time';
  }
  if (raw === 'rating') return 'rating';
  if (raw === 'cost' || raw === 'cost_low' || raw === 'cost_high') return 'cost';
  return undefined;
}

export function nearbySortFromHome(sort: HomeFilterState['sort']): NearbySort | undefined {
  if (sort === 'rating') return 'rating';
  if (sort === 'fastest' || sort === 'nearest') return 'delivery_time';
  if (sort === 'cost_low' || sort === 'cost_high') return 'cost';
  if (sort === 'relevance') return 'relevance';
  return undefined;
}

export function minRatingFromHome(band: HomeFilterState['ratingBand']): number | undefined {
  if (band === '4.5') return 4.5;
  if (band === '4.0') return 4;
  if (band === '3.5') return 3.5;
  return undefined;
}

/**
 * Map home price chips → restaurant-service enums
 * (`budget` | `moderate` | `expensive` | `fine_dining`).
 */
export function priceRangeFromHome(
  band: HomeFilterState['priceBand']
): { priceRange?: 'budget' | 'moderate' | 'expensive' | 'fine_dining' } {
  if (band === 'under_200') return { priceRange: 'budget' };
  if (band === '200_350') return { priceRange: 'moderate' };
  if (band === 'above_350') return { priceRange: 'expensive' };
  return {};
}

/** Map home filter chips → GET /restaurants/nearby extras. */
export function homeFiltersToNearbyParams(
  coords: { lat: number; lng: number },
  filters: HomeFilterState,
  extras?: { radius?: number; limit?: number; page?: number }
): NearbyParams {
  const price = priceRangeFromHome(filters.priceBand);
  return {
    lat: coords.lat,
    lng: coords.lng,
    radius: extras?.radius ?? 15,
    limit: extras?.limit ?? 40,
    page: extras?.page,
    veg: filters.pureVeg || undefined,
    minRating: minRatingFromHome(filters.ratingBand),
    priceRange: price.priceRange,
    sort: nearbySortFromHome(filters.sort),
    offers: filters.offersOnly || undefined,
    // Do NOT default hygiene=true — that requires hygieneScore ≥ 4 and
    // hides almost every newly onboarded restaurant (default score is 0).
  };
}
