export type PaginationMeta = {
  total?: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasNext: boolean;
};

export type Restaurant = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  coverUrl?: string;
  logoUrl?: string;
  rating?: number;
  reviewCount?: number;
  cuisines?: string[];
  /** Menu category labels from restaurant document (e.g. Starters, Beverages) */
  menuCategories?: string[];
  tags?: string[];
  deliveryTime?: string;
  priceForTwo?: number;
  costForTwo?: number;
  priceRange?: string;
  distance?: number;
  isOpen?: boolean;
  address?: string;
  city?: string;
  offer?: string;
  status?: string;
  isPureVeg?: boolean;
  isFeatured?: boolean;
  isPromoted?: boolean;
  fssaiLicense?: string;
  slug?: string;
  avgRating?: number;
  totalRatings?: number;
  offerBadges?: string[];
  deliveryTimeLabel?: string;
  promiseMinutes?: number;
  hygieneScore?: number;
  isOnline?: boolean;
  isOpenNow?: boolean;
  nextOpenAt?: string;
  minOrderValue?: number;
  freeDeliveryThreshold?: number;
  maxDeliveryRadius?: number;
  packagingCharge?: number;
  isCashOnDelivery?: boolean;
  isOnlinePayment?: boolean;
  acceptScheduledOrders?: boolean;
  lat?: number;
  lng?: number;
  images?: string[];
  timings?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MenuCategory = {
  id: string;
  name: string;
  description?: string;
  sortOrder?: number;
  itemCount?: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryId?: string;
  categoryName?: string;
  isVeg?: boolean;
  isVegan?: boolean;
  isAvailable?: boolean;
  isBestSeller?: boolean;
  isRecommended?: boolean;
  isNew?: boolean;
  spiceLevel?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  sortOrder?: number;
  allergens?: string[];
  totalOrdered?: number;
  [key: string]: unknown;
};

/** Query filters for GET /restaurants/:id/items */
export type MenuItemListParams = {
  categoryId?: string;
  /** Backend `veg=` flag */
  veg?: boolean;
  isVeg?: boolean;
  isBestSeller?: boolean;
  isAvailable?: boolean;
  isRecommended?: boolean;
  /** Backend `recommended=1` rail */
  recommended?: boolean;
  isNew?: boolean;
  /** Backend `q=` menu search */
  q?: string;
  search?: string;
};

export type CuisineChip = {
  id: string;
  name: string;
  slug: string;
  restaurantCount?: number;
  imageUrl?: string;
};

export type DayTimingSlot = {
  open?: string;
  close?: string;
  label?: string;
};

export type RestaurantTimings = {
  isOpenNow?: boolean;
  nextOpenAt?: string;
  slots: Record<string, DayTimingSlot[] | string>;
  raw?: Record<string, unknown>;
};

export type RestaurantHygiene = {
  fssaiMasked?: string;
  hygieneScore?: number;
  raw?: Record<string, unknown>;
};

export type CustomizationOption = {
  id: string;
  name: string;
  price: number;
  isVeg?: boolean;
  isAvailable?: boolean;
};

export type CustomizationGroup = {
  id: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options: CustomizationOption[];
};

export type RestaurantRatings = {
  avgRating: number;
  totalRatings: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type KitchenAlert = {
  id: string;
  type: 'notify-open' | 'notify-stock' | string;
  restaurantId?: string;
  restaurantName?: string;
  itemId?: string;
  itemName?: string;
  active?: boolean;
  pushed?: boolean;
};

export type RestaurantMenu = {
  categories: MenuCategory[];
  items: MenuItem[];
};

export type RestaurantOffer = {
  id: string;
  title: string;
  description?: string;
  code?: string;
  discountType?: string;
  discountValue?: number;
  minOrderAmount?: number;
  validUntil?: string;
  isActive?: boolean;
  [key: string]: unknown;
};

export type RestaurantListParams = {
  page?: number;
  limit?: number;
  search?: string;
  cuisine?: string;
  city?: string;
  sort?: string;
  lat?: number;
  lng?: number;
  veg?: boolean;
  minRating?: number;
  /** When true, fetches every page until hasNext is false. */
  fetchAll?: boolean;
};

export type NearbySort =
  | 'delivery_time'
  | 'rating'
  | 'cost'
  | 'relevance'
  | 'newest';

export type NearbyParams = {
  lat: number;
  lng: number;
  radius?: number;
  page?: number;
  limit?: number;
  veg?: boolean;
  minRating?: number;
  cost?: number | string;
  priceRange?: string;
  sort?: NearbySort | string;
  offers?: boolean;
  hygiene?: boolean;
  isOnline?: boolean;
};

/** Dish shown on home “trending” rails with its restaurant. */
export type TrendingDish = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  isVeg?: boolean;
  rating?: number;
  restaurantId: string;
  restaurantName: string;
  restaurantImageUrl?: string;
};
