/**
 * Review & Rating Service.
 * Gateway prefix: /api/v1/review-service
 *
 * Customer-facing:
 *   GET  /health
 *   GET  /restaurants/:id/reviews
 *   GET  /restaurants/:id/reviews/stats
 *   POST /restaurants/:id/reviews          (auth, post-order)
 *   GET  /orders/:orderId/review          (auth)
 *
 * Owner/admin only (not used in customer app):
 *   POST /restaurants/:id/reviews/:reviewId/reply
 *   DELETE /restaurants/:id/reviews/:reviewId
 */

export type PaginationMeta = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNext?: boolean;
};

export type ReviewOwnerReply = {
  text: string;
  repliedAt?: string;
  repliedBy?: string;
};

export type RestaurantReview = {
  id: string;
  restaurantId?: string;
  orderId?: string;
  userId?: string;
  userName?: string;
  rating: number;
  comment?: string;
  title?: string;
  photos?: string[];
  /** Owner/admin reply (Swiggy/Zomato-style). */
  reply?: ReviewOwnerReply;
  createdAt?: string;
  updatedAt?: string;
};

export type RatingDistribution = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type ReviewStats = {
  average: number;
  total: number;
  distribution: RatingDistribution;
};

export type ReviewListResult = {
  reviews: RestaurantReview[];
  meta?: PaginationMeta;
};

export type SubmitReviewPayload = {
  rating: number;
  comment?: string;
  title?: string;
  orderId?: string;
  photos?: string[];
};

export type ReportReviewPayload = {
  reason: string;
};

export type SubmitOrderReviewPayload = {
  restaurantId?: string;
  /** Restaurant food rating 1–5 (sent as restaurantRating). */
  rating: number;
  comment?: string;
  title?: string;
  photos?: string[];
  packagingRating?: number;
  /** Optional per-dish ratings (1–5). Thumbs UI maps 👍→5, 👎→1. */
  dishes?: { itemId: string; rating: number }[];
};

export type SubmitDishReviewsPayload = {
  dishes: { itemId: string; rating: number }[];
};
