/**
 * Customer Service API types.
 * Gateway prefix: /api/v1/customer-service, routes mounted at /customers
 */

export type HomeBanner = {
  id: string;
  title: string;
  imageUrl?: string;
  deepLink?: string;
};

/** Restaurant card shape is defensive — backend lists are empty for now. */
export type RestaurantCard = {
  id: string;
  name: string;
  imageUrl?: string;
  rating?: number;
  cuisines?: string[];
  deliveryTime?: string;
  priceForTwo?: number;
  [key: string]: unknown;
};

export type HomeFeed = {
  banners: HomeBanner[];
  radiusKm: number;
  vegOnly: boolean;
  trending: import('@/lib/home/types').HomeRestaurantCard[];
  newlyAdded: import('@/lib/home/types').HomeRestaurantCard[];
  topRated: import('@/lib/home/types').HomeRestaurantCard[];
  pureVeg: import('@/lib/home/types').HomeRestaurantCard[];
  forYou: import('@/lib/home/types').HomeRestaurantCard[];
  orderAgain: import('@/lib/home/types').HomeOrderAgainCard[];
  dishesToTry: import('@/lib/home/types').HomeTrendingDish[];
  trendingDishes: import('@/lib/home/types').HomeTrendingDish[];
};

export type Deal = {
  id: string;
  title?: string;
  description?: string;
  code?: string;
  imageUrl?: string;
  validFrom?: string;
  validUntil?: string;
  expired?: boolean;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  minOrderValue?: number;
  maxDiscount?: number;
  restaurants?: string[]; // Applicable restaurant IDs
  [key: string]: unknown;
};

export type Recommendation = RestaurantCard;

export type CustomerProfile = {
  id: string;
  userId: string;
  totalOrders: number;
  totalSpend: number;
  averageOrderValue: number;
  favoriteRestaurants: string[];
  favoriteDishes: string[];
  recentSearches: string[];
  recentRestaurants: string[];
  tier: string;
  loyaltyPoints: number;
  onboardingCompleted: boolean;
  onboardingStep: number;
};

export type RecentActivity = {
  recentSearches: string[];
  recentRestaurants: RestaurantCard[];
};

export type OnboardingStatus = {
  completed: boolean;
  currentStep: number;
  totalSteps: number;
};

export type CustomerKitchenAlert = {
  id: string;
  type: string;
  restaurantId?: string;
  restaurantName?: string;
  itemId?: string;
  itemName?: string;
  active?: boolean;
  pushed?: boolean;
};

export const SUPPORT_CATEGORIES = [
  'order_issue',
  'payment_issue',
  'delivery_issue',
  'account_issue',
  'restaurant_issue',
  'other',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  order_issue: 'Order issue',
  payment_issue: 'Payment issue',
  delivery_issue: 'Delivery issue',
  account_issue: 'Account issue',
  restaurant_issue: 'Restaurant issue',
  other: 'Other',
};

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type TicketMessage = {
  id?: string;
  sender?: string;
  senderRole?: string;
  content: string;
  createdAt?: string;
};

export type SupportTicket = {
  id: string;
  userId: string;
  category: SupportCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: string;
  orderId?: string;
  attachments: string[];
  messages: TicketMessage[];
  rating?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
};

export type CreateTicketPayload = {
  category: SupportCategory;
  subject: string;
  description: string;
  orderId?: string;
  attachments?: string[];
};

export type AddTicketMessagePayload = {
  content: string;
};

export type RateTicketPayload = {
  rating: number;
  feedback?: string;
};

// ─── App config (splash) ──────────────────────────────────────────────────────

export type AppConfig = {
  minVersion?: string;
  latestVersion?: string;
  forceUpdate?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  cities?: Array<{ id: string; name: string; slug?: string; isActive?: boolean }>;
  flags?: Record<string, boolean | string | number>;
  announcement?: { message: string; type?: 'info' | 'warning' | 'success' } | null;
};

// ─── Collections ─────────────────────────────────────────────────────────────

export type Collection = {
  id: string;
  title: string;
  slug: string;
  imageUrl?: string;
  description?: string;
  restaurantCount?: number;
  sortOrder?: number;
};

export type CollectionRestaurantsResult = {
  collection: Collection;
  restaurants: RestaurantCard[];
  meta?: PaginationMeta;
};

// ─── Customer prefs update ────────────────────────────────────────────────────

export type UpdateCustomerPrefsPayload = {
  vegOnly?: boolean;
  preferredCuisines?: string[];
  displayName?: string;
  phone?: string;
};

// ─── Dish favourites ─────────────────────────────────────────────────────────

export type FavouriteDish = {
  id: string;
  name: string;
  imageUrl?: string;
  price?: number;
  restaurantId?: string;
  restaurantName?: string;
  isVeg?: boolean;
  rating?: number;
  [key: string]: unknown;
};

// ─── FAQ ─────────────────────────────────────────────────────────────────────

export type FaqItem = {
  id: string;
  question: string;
  answer?: string;
  category?: string;
  sortOrder?: number;
};

// ─── Callback request ────────────────────────────────────────────────────────

export type CallbackRequestPayload = {
  phone?: string;
  orderId?: string;
  reason?: string;
};

// ─── Loyalty ─────────────────────────────────────────────────────────────────

export type LoyaltyStatus = {
  points: number;
  tier: string;
  tierLabel?: string;
  nextTierPoints?: number;
  expiringPoints?: number;
  expiringDate?: string;
};

export type LoyaltyTransaction = {
  id: string;
  type: 'earn' | 'redeem' | 'expire' | string;
  points: number;
  description?: string;
  orderId?: string;
  createdAt: string;
};

// ─── Subscriptions ───────────────────────────────────────────────────────────

export type SubscriptionPlan = {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays?: number;
  benefits?: string[];
  badgeColor?: string;
  isPopular?: boolean;
};

export type ActiveSubscription = {
  id: string;
  planId: string;
  planName: string;
  status: string;
  startDate?: string;
  endDate?: string;
  cancelAtPeriodEnd?: boolean;
} | null;

// ─── Scratch cards ───────────────────────────────────────────────────────────

export type ScratchCard = {
  id: string;
  status: 'pending' | 'revealed' | 'used' | 'expired';
  reward?: string;
  couponCode?: string;
  discount?: number;
  expiresAt?: string;
  orderId?: string;
};

// ─── App feedback & crash ────────────────────────────────────────────────────

export type CrashReportPayload = {
  error: string;
  stack?: string;
  componentStack?: string;
  appVersion?: string;
  platform?: string;
  deviceModel?: string;
};

export type AppFeedbackPayload = {
  rating?: number;
  message: string;
  screen?: string;
  orderId?: string;
};
