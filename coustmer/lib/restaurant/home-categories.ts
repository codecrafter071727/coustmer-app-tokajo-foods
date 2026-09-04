import type { HomeCategory } from '@/lib/home/types';
import { menuItemImageForName } from '@/lib/restaurant/menu-item-images';
import {
  FOOD_CATEGORIES,
  findCategoryBySlug,
} from '@/lib/restaurant/categories';
import type { Restaurant } from '@/lib/restaurant/types';

export const HOME_CATEGORY_PREVIEW_COUNT = 24;

export function slugifyCategoryLabel(label: string): string {
  return String(label ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(label: string): string {
  return String(label ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Marketing / menu chrome — never mind chips. */
const NOISE =
  /^(all|recommended|bestsellers?|best sellers?|chef'?s? specials?|main courses?|mains?|starters?|appetizers?|sides?|extras?|add[- ]?ons?|combos?|breads?( and rice)?|rice and breads?|beverages?|drinks?|soups?|salads?|accompaniments?|others?|misc|popular|new|new arrivals?|today'?s? specials?|snacks?|featured|promoted|pure[- ]?veg|veg|non[- ]?veg|vegetarian|hygiene|fssai|open|closed|top rated|trending|free delivery|offer|offers|deal|deals)$/i;

function isNoise(label: string): boolean {
  const clean = label.trim();
  return !clean || clean.length < 2 || NOISE.test(clean);
}

/** Photo only — never rewrite the cuisine label/slug from FOOD_CATEGORIES. */
export function resolveMindCategoryImage(slug: string, label: string): string {
  const known =
    findCategoryBySlug(slug) ||
    findCategoryBySlug(label) ||
    FOOD_CATEGORIES.find(
      (c) =>
        c.slug === slug ||
        c.label.toLowerCase() === label.toLowerCase()
    );

  const url = known?.imageUrl || menuItemImageForName(label || slug);
  if (!url) return menuItemImageForName('food');
  if (url.includes('w=')) {
    return url.replace(/([?&])w=\d+/g, '$1w=400').replace(/([?&])h=\d+/g, '$1h=400');
  }
  return `${url}${url.includes('?') ? '&' : '?'}w=400&h=400&fit=crop&q=80`;
}

type Bucket = {
  label: string;
  slug: string;
  count: number;
  /** Restaurant ids that actually list this cuisine. */
  restaurantIds: string[];
};

/**
 * Unique cuisines that appear on the given restaurants — each once.
 * Label/slug stay exactly as stored on restaurants (no FOOD_CATEGORIES rename).
 */
export function buildHomeCategories(input: {
  restaurants: Restaurant[];
}): HomeCategory[] {
  const buckets = new Map<string, Bucket>();

  for (const r of input.restaurants) {
    if (!r?.id || r.status === 'deleted') continue;

    const seenOnRestaurant = new Set<string>();
    for (const raw of r.cuisines ?? []) {
      const clean = titleCase(String(raw));
      if (isNoise(clean)) continue;
      const slug = slugifyCategoryLabel(clean);
      if (!slug || seenOnRestaurant.has(slug)) continue;
      seenOnRestaurant.add(slug);

      const existing = buckets.get(slug);
      if (existing) {
        existing.count += 1;
        existing.restaurantIds.push(r.id);
      } else {
        buckets.set(slug, {
          label: clean,
          slug,
          count: 1,
          restaurantIds: [r.id],
        });
      }
    }
  }

  return [...buckets.values()]
    .filter((b) => b.restaurantIds.length > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    })
    .slice(0, HOME_CATEGORY_PREVIEW_COUNT)
    .map((b, i) => ({
      id: b.slug,
      label: b.label,
      slug: b.slug,
      imageUrl: resolveMindCategoryImage(b.slug, b.label),
      sortOrder: i + 1,
    }));
}
