/**
 * Search Service (public).
 * Gateway prefix: /api/v1/search-service
 * Routes: GET /restaurants | /dishes | /combined | /suggestions | /health
 *
 * Note: backend rejects text (`q`) + geo (`lat`/`lng`) in the same query
 * ("text and geoNear not allowed"). Client omits geo when `q` is set.
 */

export type PaginationMeta = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNext?: boolean;
};

export type SearchRestaurant = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  coverUrl?: string;
  rating?: number;
  reviewCount?: number;
  cuisines?: string[];
  deliveryTime?: string;
  priceForTwo?: number;
  distance?: number;
  isOpen?: boolean;
  address?: string;
  city?: string;
  offer?: string;
  isPureVeg?: boolean;
  lat?: number;
  lng?: number;
};

export type SearchDish = {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
  rating?: number;
  restaurantId: string;
  restaurantName?: string;
  categoryId?: string;
  categoryName?: string;
};

export type SearchSuggestion = {
  id: string;
  text: string;
  type?: 'restaurant' | 'dish' | 'cuisine' | 'query' | string;
  restaurantId?: string;
  dishId?: string;
  imageUrl?: string;
};

export type SearchRestaurantsParams = {
  q?: string;
  cuisine?: string;
  lat?: number;
  lng?: number;
  sort?: string;
  page?: number;
  limit?: number;
};

export type SearchDishesParams = {
  q?: string;
  restaurantId?: string;
  veg?: boolean;
  page?: number;
  limit?: number;
};

export type SearchCombinedParams = {
  q: string;
  cuisine?: string;
  lat?: number;
  lng?: number;
  veg?: boolean;
  page?: number;
  limit?: number;
};

export type SearchSuggestionsParams = {
  q: string;
  limit?: number;
  lat?: number;
  lng?: number;
  /** Meters — search-service default ~50km when omitted. */
  radius?: number;
};

export type SearchRestaurantsResult = {
  restaurants: SearchRestaurant[];
  meta?: PaginationMeta;
  query?: string;
};

export type SearchDishesResult = {
  dishes: SearchDish[];
  meta?: PaginationMeta;
  query?: string;
};

export type SearchCombinedResult = {
  restaurants: SearchRestaurant[];
  dishes: SearchDish[];
  query?: string;
  meta?: PaginationMeta;
};

export type SearchSuggestionsResult = {
  suggestions: SearchSuggestion[];
  query?: string;
};
