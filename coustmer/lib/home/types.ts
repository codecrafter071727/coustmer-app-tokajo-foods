/** Restaurant card for horizontal home rails (from customer-service home feed). */
export type HomeRestaurantCard = {
  id: string;
  name: string;
  image?: string | null;
  rating?: number;
  deliveryTime?: string | null;
  cuisines?: string[];
  isPureVeg?: boolean;
  isOpenNow?: boolean;
  availabilityLabel?: string | null;
  hoursToday?: string | null;
  reviewCount?: number;
  distanceKm?: number;
  slug?: string | null;
  hasOffers?: boolean;
};

/** Order-again rail card — recent restaurants in delivery radius. */
export type HomeOrderAgainCard = HomeRestaurantCard & {
  lastOrderedAt?: string | null;
  itemsSummary?: string | null;
};

/** Dish card for "Dishes to try" rail. */
export type HomeTrendingDish = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  isVeg?: boolean;
  rating?: number;
  restaurantId: string;
  restaurantName: string;
  badge?: string | null;
};

export type HomeRailVariant =
  | 'trending'
  | 'new'
  | 'top-rated'
  | 'pure-veg'
  | 'order-again'
  | 'for-you';
