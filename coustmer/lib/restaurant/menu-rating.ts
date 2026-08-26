/** Raw menu item shape from API or mapped MenuItem. */
export type MenuItemRatingSource = {
  rating?: unknown;
  avgRating?: unknown;
  tags?: unknown;
} | null | undefined;

function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Menu dish rating from API fields only — never invent seed tags. */
export function getMenuItemRating(item: MenuItemRatingSource): number | null {
  if (!item) return null;
  return parsePositiveNumber(item.rating ?? item.avgRating);
}

/** Review count from API fields only. */
export function getMenuItemReviewCount(item: MenuItemRatingSource): number | null {
  if (!item) return null;
  return parsePositiveNumber(
    (item as Record<string, unknown>).reviewCount ??
      (item as Record<string, unknown>).totalRatings
  );
}

function ratingFromBreakdown(source: Record<string, unknown>): number | null {
  const breakdown = source.ratingBreakdown;
  if (!breakdown || typeof breakdown !== 'object' || Array.isArray(breakdown)) return null;
  const b = breakdown as Record<string, unknown>;
  const counts = [1, 2, 3, 4, 5].map((star) => Number(b[String(star)] ?? 0));
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total <= 0) return null;
  return counts.reduce((sum, n, i) => sum + n * (i + 1), 0) / total;
}

/** Restaurant rating: avgRating, rating, nested ratings, then star histogram. */
export function getRestaurantRating(source: MenuItemRatingSource): number | null {
  if (!source) return null;
  const rec = source as Record<string, unknown>;
  const nested =
    rec.ratings && typeof rec.ratings === 'object' && !Array.isArray(rec.ratings)
      ? (rec.ratings as Record<string, unknown>)
      : null;
  return (
    parsePositiveNumber(source.avgRating) ??
    parsePositiveNumber(source.rating) ??
    parsePositiveNumber(nested?.average) ??
    parsePositiveNumber(nested?.avgRating) ??
    parsePositiveNumber(nested?.avg) ??
    ratingFromBreakdown(rec)
  );
}
