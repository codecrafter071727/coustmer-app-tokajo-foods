import { menuItemImageForName } from '@/lib/restaurant/menu-item-images';
import {
  FOOD_CATEGORIES,
  findCategoryBySlug,
} from '@/lib/restaurant/categories';

const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=400&h=400&fit=crop&q=80`;

/** Extra menu-section photos when FOOD_CATEGORIES / dish mapper miss. */
const SECTION_PHOTOS: Record<string, string> = {
  starters: u('photo-1544025162-d76694265947'),
  starter: u('photo-1544025162-d76694265947'),
  appetizers: u('photo-1544025162-d76694265947'),
  'main-course': u('photo-1603894584372-a7369195528d'),
  mains: u('photo-1603894584372-a7369195528d'),
  beverages: u('photo-1513558161293-cdaf765ed2fd'),
  drinks: u('photo-1513558161293-cdaf765ed2fd'),
  snacks: u('photo-1601050690597-df0568f70950'),
  sides: u('photo-1586190848861-99aa4a171e90'),
  breads: u('photo-1626074353765-517a681e40be'),
  'breads-and-rice': u('photo-1516684732701-375e770c5a3a'),
  rice: u('photo-1516684732701-375e770c5a3a'),
  soups: u('photo-1547592166-23ac45744acd'),
  salads: u('photo-1512621776951-a57141f2eefd'),
  combos: u('photo-1546833999-b9f581a1996d'),
  thali: u('photo-1546833999-b9f581a1996d'),
  pizza: u('photo-1513104890138-7c749659a591'),
  burgers: u('photo-1568901346375-23c9450c58cd'),
  burger: u('photo-1568901346375-23c9450c58cd'),
  chaat: u('photo-1606491956689-2ea866258177'),
  'south-indian': u('photo-1630383249896-424e482df921'),
  chinese: u('photo-1525755662778-989d0524087e'),
  biryani: u('photo-1589302168068-964664d93dc0'),
  desserts: u('photo-1578985545062-69928b1d9587'),
  dessert: u('photo-1578985545062-69928b1d9587'),
  sweets: u('photo-1606313564200-e75d5e30476c'),
  breakfast: u('photo-1482049016688-2d3e1b311543'),
};

function normalizeKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function squareCrop(url: string): string {
  if (!url) return url;
  if (/[?&]w=/.test(url)) {
    return url
      .replace(/([?&])w=\d+/g, '$1w=400')
      .replace(/([?&])h=\d+/g, '$1h=400');
  }
  return `${url}${url.includes('?') ? '&' : '?'}w=400&h=400&fit=crop&q=80`;
}

/**
 * Always return a real food photo for a mind / menu-category chip.
 * Prefer API url when it looks like a real image; else curated dish photo.
 */
export function resolveMindChipImage(
  slug: string,
  label: string,
  apiUrl?: string | null
): string {
  const trimmed = typeof apiUrl === 'string' ? apiUrl.trim() : '';
  if (
    trimmed &&
    /^https?:\/\//i.test(trimmed) &&
    !/via\.placeholder|placehold\.co|dummyimage/i.test(trimmed)
  ) {
    return squareCrop(trimmed);
  }

  const key = normalizeKey(slug) || normalizeKey(label);
  if (key && SECTION_PHOTOS[key]) return SECTION_PHOTOS[key];

  const known =
    findCategoryBySlug(slug) ||
    findCategoryBySlug(label) ||
    FOOD_CATEGORIES.find(
      (c) =>
        c.slug === key ||
        c.label.toLowerCase() === label.toLowerCase()
    );
  if (known?.imageUrl) return squareCrop(known.imageUrl);

  for (const [k, url] of Object.entries(SECTION_PHOTOS)) {
    if (key.includes(k) || normalizeKey(label).includes(k)) return url;
  }

  return squareCrop(menuItemImageForName(label || slug || 'food'));
}
