import type { HomeCategory } from '@/lib/home/types';
import { menuItemImageForName } from '@/lib/restaurant/menu-item-images';
import {
  FOOD_CATEGORIES,
  findCategoryBySlug,
} from '@/lib/restaurant/categories';
import type { Restaurant } from '@/lib/restaurant/types';

export const HOME_CATEGORY_PREVIEW_COUNT = 20;

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

/** Not cuisine chips — menu chrome / noise. */
const NOISE =
  /^(all|recommended|bestsellers?|best sellers?|chef'?s? specials?|main courses?|mains?|starters?|appetizers?|sides?|extras?|add[- ]?ons?|combos?|breads?( and rice)?|rice and breads?|beverages?|drinks?|soups?|salads?|accompaniments?|others?|misc|popular|new arrivals?|today'?s? specials?|snacks?)$/i;

function isNoise(label: string): boolean {
  const clean = label.trim();
  return !clean || clean.length < 2 || NOISE.test(clean);
}

/** Cuisine / dish photo — always a concrete square Unsplash URL. */
export function resolveMindCategoryImage(slug: string, label: string): string {
  const known =
    findCategoryBySlug(slug) ||
    findCategoryBySlug(label) ||
    FOOD_CATEGORIES.find(
      (c) =>
        c.slug === slug ||
        c.label.toLowerCase() === label.toLowerCase() ||
        slug.includes(c.slug) ||
        c.slug.includes(slug)
    );

  if (known?.imageUrl) {
    return known.imageUrl.includes('?')
      ? known.imageUrl.replace(/([?&])w=\d+/g, '$1w=400').replace(/([?&])h=\d+/g, '$1h=400')
      : `${known.imageUrl}?w=400&h=400&fit=crop&q=80`;
  }

  return menuItemImageForName(label || slug).replace(
    /([?&])w=\d+/g,
    '$1w=400'
  );
}

type Bucket = { label: string; slug: string; count: number };

/**
 * Unique cuisine tags from nearby restaurants only — each slug once.
 * Does not invent a global cuisine list or menu-section names.
 */
export function buildHomeCategories(input: {
  restaurants: Restaurant[];
}): HomeCategory[] {
  const buckets = new Map<string, Bucket>();

  for (const r of input.restaurants) {
    if (!r?.id || r.status === 'deleted') continue;

    // One pass per restaurant: each cuisine on that outlet counted once.
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
      } else {
        buckets.set(slug, { label: clean, slug, count: 1 });
      }
    }
  }

  return [...buckets.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    })
    .slice(0, HOME_CATEGORY_PREVIEW_COUNT)
    .map((b, i) => {
      const known = findCategoryBySlug(b.slug) || findCategoryBySlug(b.label);
      const label = known?.label || b.label;
      const slug = known?.slug || b.slug;
      return {
        id: slug,
        label,
        slug,
        imageUrl: resolveMindCategoryImage(slug, label),
        color: known?.color,
        sortOrder: i + 1,
      };
    });
}
