import type { Restaurant } from '@/lib/restaurant/types';

/** Swiggy-style home list chunks: preview → mid → remainder. */
export function splitHomeRestaurantList(
  restaurants: Restaurant[],
  firstCount = 4,
  midCount = 4
): {
  first: Restaurant[];
  mid: Restaurant[];
  rest: Restaurant[];
} {
  const first = restaurants.slice(0, firstCount);
  const mid = restaurants.slice(firstCount, firstCount + midCount);
  const rest = restaurants.slice(firstCount + midCount);
  return { first, mid, rest };
}
