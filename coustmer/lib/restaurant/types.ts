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
  [key: string]: unknown;
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
  /** When true, fetches every page until hasNext is false. */
  fetchAll?: boolean;
};

export type NearbyParams = {
  lat: number;
  lng: number;
  radius?: number;
  page?: number;
  limit?: number;
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
