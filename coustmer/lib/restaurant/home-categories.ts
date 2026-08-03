import type { HomeCategory } from '@/lib/home/types';
import {
  FOOD_CATEGORIES,
  findCategoryBySlug,
} from '@/lib/restaurant/categories';
import type { MenuCategory, Restaurant } from '@/lib/restaurant/types';

export const HOME_CATEGORY_PREVIEW_COUNT = 10;

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=300&fit=crop&q=80';

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

function resolveImage(slug: string, label: string): string {
  const known =
    findCategoryBySlug(slug) ||
    findCategoryBySlug(label) ||
    FOOD_CATEGORIES.find(
      (c) =>
        c.label.toLowerCase() === label.toLowerCase() ||
        c.slug === slug ||
        label.toLowerCase().includes(c.label.toLowerCase())
    );
  return known?.imageUrl || FALLBACK_IMAGE;
}

type Bucket = { label: string; slug: string; count: number };

function bump(map: Map<string, Bucket>, label: string) {
  const clean = titleCase(label);
  if (!clean || clean.toLowerCase() === 'all') return;
  const slug = slugifyCategoryLabel(clean);
  if (!slug) return;
  const existing = map.get(slug);
  if (existing) {
    existing.count += 1;
    return;
  }
  map.set(slug, { label: clean, slug, count: 1 });
}

/**
 * Build home “What's on your mind” chips from live restaurant data +
 * GET /restaurants/:id/categories samples so new categories appear automatically.
 */
export function buildHomeCategories(input: {
  restaurants: Restaurant[];
  menuCategories?: MenuCategory[];
}): HomeCategory[] {
  const buckets = new Map<string, Bucket>();

  for (const r of input.restaurants) {
    for (const c of r.cuisines ?? []) bump(buckets, c);
    for (const c of r.menuCategories ?? []) bump(buckets, c);
  }

  for (const c of input.menuCategories ?? []) {
    if (c.name) bump(buckets, c.name);
  }

  // Keep known food categories that appear at least once, then any API-only names
  const ranked = [...buckets.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });

  // If API returned nothing useful, fall back to curated list (still dynamic-ready)
  if (ranked.length === 0) {
    return FOOD_CATEGORIES.filter((c) => c.slug !== 'all').map((c, i) => ({
      id: c.slug,
      label: c.label,
      slug: c.slug,
      imageUrl: c.imageUrl,
      color: c.color,
      sortOrder: i + 1,
    }));
  }

  return ranked.map((b, i) => ({
    id: b.slug,
    label: b.label,
    slug: b.slug,
    imageUrl: resolveImage(b.slug, b.label),
    sortOrder: i + 1,
  }));
}
