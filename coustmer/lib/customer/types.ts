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
  trending: RestaurantCard[];
  forYou: RestaurantCard[];
  newlyAdded: RestaurantCard[];
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
