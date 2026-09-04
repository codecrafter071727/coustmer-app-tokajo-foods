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

/** Dish card for "Dishes to try" / order-again rails. */
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

/** Order-again rail — food items the customer previously ordered. */
export type HomeOrderAgainDish = HomeTrendingDish & {
  lastOrderedAt?: string | null;
  orderCount?: number;
};

/** @deprecated Prefer HomeOrderAgainDish (food items). */
export type HomeOrderAgainCard = HomeOrderAgainDish;

export type HomeRailVariant =
  | 'trending'
  | 'new'
  | 'top-rated'
  | 'pure-veg'
  | 'order-again'
  | 'for-you';

/** Cuisine / dish chips on home “What's on your mind”. */
export type HomeCategory = {
  id: string;
  label: string;
  slug: string;
  imageUrl?: string;
  color?: string;
  sortOrder?: number;
};
