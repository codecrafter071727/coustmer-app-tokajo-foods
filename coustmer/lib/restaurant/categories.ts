import type { LucideIcon } from 'lucide-react-native';
import {
  Beef,
  CakeSlice,
  Coffee,
  Cookie,
  Croissant,
  Drumstick,
  EggFried,
  Fish,
  GlassWater,
  IceCream,
  Nut,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
  Wheat,
} from 'lucide-react-native';

export type FoodCategory = {
  label: string;
  slug: string;
  icon: LucideIcon;
  color: string;
  /** Real food photo for category chips */
  imageUrl: string;
};

/** Slugs are sent to GET /restaurants?cuisine=... */
export const FOOD_CATEGORIES: FoodCategory[] = [
  {
    label: 'All',
    slug: 'all',
    icon: UtensilsCrossed,
    color: '#AC0F45',
    imageUrl:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Pizza',
    slug: 'pizza',
    icon: Pizza,
    color: '#E8590C',
    imageUrl:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Biryani',
    slug: 'biryani',
    icon: Drumstick,
    color: '#C4520A',
    imageUrl:
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Burgers',
    slug: 'burger',
    icon: Sandwich,
    color: '#D97706',
    imageUrl:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Cake',
    slug: 'dessert',
    icon: CakeSlice,
    color: '#DB2777',
    imageUrl:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'North Indian',
    slug: 'north-indian',
    icon: Soup,
    color: '#B45309',
    imageUrl:
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Chinese',
    slug: 'chinese',
    icon: Soup,
    color: '#DC2626',
    imageUrl:
      'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'South Indian',
    slug: 'south-indian',
    icon: Cookie,
    color: '#CA8A04',
    imageUrl:
      'https://images.unsplash.com/photo-1630383249896-424e482df921?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Rolls',
    slug: 'rolls',
    icon: Wheat,
    color: '#EA580C',
    imageUrl:
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Momos',
    slug: 'momos',
    icon: Cookie,
    color: '#AC0F45',
    imageUrl:
      'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Shawarma',
    slug: 'shawarma',
    icon: Beef,
    color: '#9A3412',
    imageUrl:
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Thali',
    slug: 'thali',
    icon: UtensilsCrossed,
    color: '#A16207',
    imageUrl:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Pasta',
    slug: 'pasta',
    icon: Wheat,
    color: '#D97706',
    imageUrl:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Noodles',
    slug: 'noodles',
    icon: Soup,
    color: '#EA580C',
    imageUrl:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Kebab',
    slug: 'kebab',
    icon: Drumstick,
    color: '#AC0F45',
    imageUrl:
      'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Chicken',
    slug: 'chicken',
    icon: Drumstick,
    color: '#AC0F45',
    imageUrl:
      'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Seafood',
    slug: 'seafood',
    icon: Fish,
    color: '#0891B2',
    imageUrl:
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Veg Meal',
    slug: 'healthy',
    icon: Salad,
    color: '#16A34A',
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Salad',
    slug: 'salad',
    icon: Salad,
    color: '#15803D',
    imageUrl:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Breakfast',
    slug: 'breakfast',
    icon: EggFried,
    color: '#CA8A04',
    imageUrl:
      'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Sandwich',
    slug: 'sandwich',
    icon: Sandwich,
    color: '#D97706',
    imageUrl:
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Coffee',
    slug: 'coffee',
    icon: Coffee,
    color: '#7C4A21',
    imageUrl:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Juice',
    slug: 'juice',
    icon: GlassWater,
    color: '#F59E0B',
    imageUrl:
      'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Chaat',
    slug: 'chaat',
    icon: Nut,
    color: '#EA580C',
    imageUrl:
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Bakery',
    slug: 'bakery',
    icon: Croissant,
    color: '#B45309',
    imageUrl:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Ice Cream',
    slug: 'ice-cream',
    icon: IceCream,
    color: '#7C3AED',
    imageUrl:
      'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Soups',
    slug: 'soup',
    icon: Soup,
    color: '#CA8A04',
    imageUrl:
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&h=300&fit=crop&q=80',
  },
  {
    label: 'Sweets',
    slug: 'sweets',
    icon: Cookie,
    color: '#DB2777',
    imageUrl:
      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&h=300&fit=crop&q=80',
  },
];

/** How many categories show before “Show all” on home. */
export const CATEGORY_COLLAPSED_COUNT = 10;

export function findCategoryBySlug(slug?: string) {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase();
  return FOOD_CATEGORIES.find(
    (cat) =>
      cat.slug === normalized ||
      cat.label.toLowerCase() === normalized ||
      cat.label.toLowerCase().replace(/\s+/g, '-') === normalized
  );
}

export function restaurantMatchesCategory(
  restaurant: {
    cuisines?: string[];
    menuCategories?: string[];
    name?: string;
  },
  slug: string
) {
  if (!slug || slug === 'all') return true;

  const category = findCategoryBySlug(slug);
  const needle = (category?.slug ?? slug).toLowerCase().replace(/-/g, ' ');
  const label = (category?.label ?? slug.replace(/-/g, ' ')).toLowerCase();

  const matchesText = (value: string) => {
    const cLower = value.toLowerCase();
    return (
      cLower.includes(needle) ||
      cLower.includes(label) ||
      label.includes(cLower) ||
      cLower.includes(slug.toLowerCase())
    );
  };

  if (restaurant.cuisines?.some(matchesText)) return true;
  if (restaurant.menuCategories?.some(matchesText)) return true;

  return (restaurant.name ?? '').toLowerCase().includes(needle);
}

/** Match a restaurant menu category (from GET .../categories) to a home cuisine slug. */
export function menuCategoryMatchesCuisine(
  menuCategory: { id?: string; name?: string },
  cuisineSlug: string
): boolean {
  if (!cuisineSlug || cuisineSlug === 'all') return true;

  const name = String(menuCategory.name ?? '').toLowerCase().trim();
  if (!name) return false;

  const food = findCategoryBySlug(cuisineSlug);
  const slug = (food?.slug ?? cuisineSlug).toLowerCase().replace(/_/g, '-');
  const slugWords = slug.replace(/-/g, ' ');
  const label = (food?.label ?? cuisineSlug.replace(/[-_]/g, ' ')).toLowerCase();

  // Exact / contained category title match (strict — avoid item-name false positives)
  if (
    name === label ||
    name === slugWords ||
    name === slug ||
    name.includes(slugWords) ||
    name.includes(label)
  ) {
    return true;
  }

  // Known menu-category aliases for home chips (Beverages, Starters, …)
  const aliases: Record<string, string[]> = {
    beverages: [
      'beverage',
      'drink',
      'drinks',
      'juice',
      'juices',
      'shake',
      'shakes',
      'smoothie',
      'coffee',
      'tea',
      'lassi',
      'mocktail',
      'softdrink',
      'soft drink',
      'hot beverage',
      'fresh juice',
    ],
    starters: ['starter', 'appetizer', 'appetisers', 'snack', 'snacks', 'tikka', 'kabab', 'kebab'],
    'main-course': ['main course', 'mains', 'main', 'curry', 'curries', 'entree'],
    desserts: ['dessert', 'sweet', 'sweets', 'ice cream', 'pastry', 'cake'],
    dessert: ['dessert', 'sweet', 'sweets', 'ice cream', 'pastry', 'cake'],
    breads: ['bread', 'breads', 'naan', 'roti', 'rice'],
    'breads-and-rice': ['bread', 'breads', 'naan', 'roti', 'rice'],
    breakfast: ['breakfast', 'morning'],
    pizza: ['pizza', 'pizzas'],
    pizzas: ['pizza', 'pizzas'],
    biryani: ['biryani', 'biriyani'],
    'biryani-specials': ['biryani', 'biriyani'],
    dosa: ['dosa', 'idli', 'vada'],
    chaat: ['chaat'],
    thalis: ['thali', 'thalis'],
    grills: ['grill', 'grills', 'kabab', 'kebab'],
    'grills-and-kababs': ['grill', 'kabab', 'kebab'],
  };

  const keys = aliases[slug] ?? aliases[slugWords.replace(/\s+/g, '-')] ?? [];
  return keys.some((k) => name.includes(k));
}

/** True if a menu item belongs to the selected home category. */
export function menuItemMatchesCategory(
  item: {
    name?: string;
    categoryId?: string;
    categoryName?: string;
  },
  cuisineSlug: string,
  matchedCategoryIds?: Set<string>
): boolean {
  if (!cuisineSlug || cuisineSlug === 'all') return true;

  if (item.categoryId && matchedCategoryIds?.has(item.categoryId)) {
    return true;
  }

  if (item.categoryName) {
    return menuCategoryMatchesCuisine({ name: item.categoryName }, cuisineSlug);
  }

  // No category on item — do not guess from dish name (avoids Butter Chicken under Beverages)
  return false;
}

/** Pick the best menu category id for a cuisine filter, or null. */
export function resolveMenuCategoryId(
  menuCategories: { id: string; name: string }[],
  cuisineSlug?: string | null
): string | null {
  if (!cuisineSlug || cuisineSlug === 'all' || !menuCategories.length) {
    return null;
  }
  const match = menuCategories.find((c) =>
    menuCategoryMatchesCuisine(c, cuisineSlug)
  );
  return match?.id ?? null;
}
