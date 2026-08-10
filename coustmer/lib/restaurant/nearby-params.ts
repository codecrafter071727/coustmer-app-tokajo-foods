import type { HomeFilterState } from '@/lib/home/filters';
import type { NearbyParams, NearbySort } from '@/lib/restaurant/types';

export function nearbySortFromHome(sort: HomeFilterState['sort']): NearbySort | undefined {
  if (sort === 'rating') return 'rating';
  if (sort === 'fastest') return 'delivery_time';
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

export function priceRangeFromHome(
  band: HomeFilterState['priceBand']
): { cost?: number; priceRange?: string } {
  if (band === 'under_200') return { cost: 200, priceRange: 'under_200' };
  if (band === '200_350') return { priceRange: '200_350' };
  if (band === 'above_350') return { priceRange: 'above_350' };
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
    cost: price.cost,
    priceRange: price.priceRange,
    sort: nearbySortFromHome(filters.sort),
    offers: filters.offersOnly || undefined,
    hygiene: true,
  };
}
