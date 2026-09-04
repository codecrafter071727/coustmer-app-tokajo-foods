import type { HomeCategory } from '@/lib/home/types';
import { menuItemImageForName } from '@/lib/restaurant/menu-item-images';
import {
  FOOD_CATEGORIES,
  findCategoryBySlug,
} from '@/lib/restaurant/categories';
import type { MenuCategory, Restaurant } from '@/lib/restaurant/types';

export const HOME_CATEGORY_PREVIEW_COUNT = 16;

/** Square crop so circular mind chips look crisp. */
function squarePhoto(url: string): string {
  if (!url) return url;
  if (/[?&](w|h|fit)=/.test(url)) {
    return url
      .replace(/([?&])w=\d+/g, '$1w=400')
      .replace(/([?&])h=\d+/g, '$1h=400')
      .replace(/([?&])fit=[^&]+/g, '$1fit=crop');
  }
  const join = url.includes('?') ? '&' : '?';
  return `${url}${join}w=400&h=400&fit=crop&q=80`;
}

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

/**
 * Menu-section labels (not cuisine / dish families) — never invent these
 * as “What's on your mind” chips.
 */
const SECTION_NOISE =
  /^(recommended|bestsellers?|best sellers?|chef'?s? specials?|main courses?|mains?|starters?|appetizers?|sides?|extras?|add[- ]?ons?|combos?|thalis? specials?|breads?( and rice)?|rice and breads?|beverages?|drinks?|soups?|salads?|accompaniments?|others?|misc|popular|new arrivals?|today'?s? specials?)$/i;

function isNoiseLabel(label: string): boolean {
  const clean = label.trim();
  if (!clean || clean.length < 2) return true;
  if (/^all$/i.test(clean)) return true;
  return SECTION_NOISE.test(clean);
}

/** Extra cuisine tags that aren't in FOOD_CATEGORIES but still need strong photos. */
const CUISINE_PHOTO_HINTS: Record<string, string> = {
  italian: 'pasta',
  mexican: 'burger',
  thai: 'thai curry',
  japanese: 'fish',
  korean: 'noodles',
  continental: 'pasta',
  american: 'burger',
  mediterranean: 'salad',
  lebanese: 'shawarma',
  arabic: 'shawarma',
  seafood: 'fish',
  healthy: 'salad',
  breakfast: 'eggs',
  bakery: 'cake',
  cafe: 'coffee',
  coffee: 'coffee',
  sweets: 'gulab jamun',
  desserts: 'ice cream',
  ice: 'ice cream',
  juice: 'lassi',
  vegan: 'salad',
  vegetarian: 'thali',
  'fast food': 'burger',
  street: 'chaat',
  'street food': 'chaat',
  mughlai: 'biryani',
  hyderabadi: 'biryani',
  punjabi: 'butter chicken',
  gujarati: 'thali',
  bengali: 'fish',
  rajasthani: 'thali',
  kerala: 'dosa',
  andhra: 'biryani',
  tandoor: 'kebab',
  bbq: 'wings',
  grill: 'kebab',
  wraps: 'shawarma',
  sandwiches: 'sandwich',
  noodles: 'noodles',
  pasta: 'pasta',
};

function resolveImage(slug: string, label: string): string {
  const known =
    findCategoryBySlug(slug) ||
    findCategoryBySlug(label) ||
    FOOD_CATEGORIES.find(
      (c) =>
        c.slug === slug ||
        c.label.toLowerCase() === label.toLowerCase() ||
        label.toLowerCase().includes(c.label.toLowerCase()) ||
        c.label.toLowerCase().includes(label.toLowerCase())
    );

  if (known?.imageUrl) return squarePhoto(known.imageUrl);

  const hintKey = slug || slugifyCategoryLabel(label);
  const hint =
    CUISINE_PHOTO_HINTS[hintKey] ||
    CUISINE_PHOTO_HINTS[label.toLowerCase().trim()];
  if (hint) return squarePhoto(menuItemImageForName(hint));

  // Dish-name mapper for pizza / biryani / dosa / etc.
  return squarePhoto(menuItemImageForName(label));
}

type Bucket = {
  label: string;
  slug: string;
  /** How many nearby restaurants expose this category. */
  count: number;
  /** Prefer cuisine tags over menu-section names when ranking. */
  cuisineHits: number;
};

function bump(
  map: Map<string, Bucket>,
  label: string,
  kind: 'cuisine' | 'menu'
) {
  const clean = titleCase(label);
  if (isNoiseLabel(clean)) return;
  const slug = slugifyCategoryLabel(clean);
  if (!slug) return;

  const existing = map.get(slug);
  if (existing) {
    existing.count += 1;
    if (kind === 'cuisine') existing.cuisineHits += 1;
    return;
  }
  map.set(slug, {
    label: clean,
    slug,
    count: 1,
    cuisineHits: kind === 'cuisine' ? 1 : 0,
  });
}

/**
 * Build “What's on your mind” only from categories present on nearby
 * restaurants. Never pads with a hardcoded cuisine list.
 */
export function buildHomeCategories(input: {
  restaurants: Restaurant[];
  menuCategories?: MenuCategory[];
}): HomeCategory[] {
  const buckets = new Map<string, Bucket>();

  for (const r of input.restaurants) {
    if (!r?.id || r.status === 'deleted') continue;
    for (const c of r.cuisines ?? []) bump(buckets, c, 'cuisine');
    for (const c of r.menuCategories ?? []) bump(buckets, c, 'menu');
  }

  for (const c of input.menuCategories ?? []) {
    if (c?.name) bump(buckets, c.name, 'menu');
  }

  const ranked = [...buckets.values()].sort((a, b) => {
    // Cuisine tags win over generic menu names; then by restaurant coverage.
    if (b.cuisineHits !== a.cuisineHits) return b.cuisineHits - a.cuisineHits;
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });

  return ranked.slice(0, HOME_CATEGORY_PREVIEW_COUNT).map((b, i) => {
    const known = findCategoryBySlug(b.slug) || findCategoryBySlug(b.label);
    return {
      id: b.slug,
      label: known?.label || b.label,
      slug: known?.slug || b.slug,
      imageUrl: resolveImage(known?.slug || b.slug, known?.label || b.label),
      color: known?.color,
      sortOrder: i + 1,
    };
  });
}
