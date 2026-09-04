/** Node copy — keep in sync with coustmer/lib/restaurant/menu-item-images.ts */

const u = (id) =>
  `https://images.unsplash.com/${id}?w=600&h=450&fit=crop&q=80`;

/** Curated food photos — each URL is tied to a dish family below. */
export const DISH_PHOTOS = {
  butterChicken: u('photo-1603894584372-a7369195528d'),
  paneerTikka: u('photo-1567188040759-fb8a883dc6d8'),
  biryani: u('photo-1589302168068-964664d93dc0'),
  pizza: u('photo-1513104890138-7c749659a591'),
  burger: u('photo-1568901346375-23c9450c58cd'),
  kebab: u('photo-1599487488170-d11ec9c172f3'),
  springRoll: u('photo-1544025162-d76694265947'),
  fries: u('photo-1586190848861-99aa4a171e90'),
  wings: u('photo-1527477396000-e2717f6f4c83'),
  samosa: u('photo-1601050690597-df0568f70950'),
  chilliChicken: u('photo-1525755662778-989d0524087e'),
  dal: u('photo-1546833999-b9f581a1996d'),
  paneerCurry: u('photo-1631452180519-c014fe946bc7'),
  chickenCurry: u('photo-1604908176997-125f25cc6f3d'),
  mutton: u('photo-1574484284002-952d92456975'),
  manchurian: u('photo-1626082927389-6cd097cdc6ec'),
  fish: u('photo-1559339352-11d035aa65de'),
  naan: u('photo-1626074353765-517a681e40be'),
  paratha: u('photo-1565557623262-b51c2513a641'),
  rice: u('photo-1516684732701-375e770c5a3a'),
  friedRice: u('photo-1603133872878-684f208fb84b'),
  chai: u('photo-1571934811356-5cc061b6821f'),
  coffee: u('photo-1461023058943-07fcbe16d735'),
  soda: u('photo-1513558161293-cdaf765ed2fd'),
  lassi: u('photo-1525385133512-2f3bdd039054'),
  gulabJamun: u('photo-1666190092159-3171d1c91a3a'),
  brownie: u('photo-1606313564200-e75d5e30476c'),
  iceCream: u('photo-1563805042-7684c019e1cb'),
  cake: u('photo-1578985545062-69928b1d9587'),
  dosa: u('photo-1585937421612-70a008296fbe'),
  idli: u('photo-1529042410759-b3871200bafc'),
  chaat: u('photo-1606491956689-2ea866258177'),
  pavBhaji: u('photo-1590301157890-4810ed352733'),
  pasta: u('photo-1473093295043-cdd812d0e601'),
  noodles: u('photo-1569718212165-3a8278d5f624'),
  momos: u('photo-1496116218417-1a781b1d4160'),
  shake: u('photo-1572490122747-3964b21cbd70'),
  sandwich: u('photo-1528735602780-2552fd466c7d'),
  salad: u('photo-1512621776951-a57141f2eefd'),
  thali: u('photo-1546833999-b9f581a1996d'),
  soup: u('photo-1547592166-23ac45744acd'),
  garlicBread: u('photo-1509440159596-0249088772ff'),
  thaiCurry: u('photo-1455619452474-d2be8b1e70cd'),
  pancakes: u('photo-1567620905732-2d1ec7ab7445'),
  eggs: u('photo-1482049016688-2d3e1b311543'),
  steak: u('photo-1544025162-d76694265947'),
  plated: u('photo-1504674900247-0877df9cc836'),
};

/** Most-specific rules first. */
const NAME_RULES = [
  { keys: ['butter chicken', 'murgh makhani'], photo: 'butterChicken' },
  {
    keys: [
      'margherita',
      'farmhouse',
      'bbq pizza',
      'paneer tikka pizza',
      'pizza',
    ],
    photo: 'pizza',
  },
  { keys: ['paneer tikka'], photo: 'paneerTikka' },
  {
    keys: [
      'kadhai paneer',
      'kadai paneer',
      'paneer butter',
      'palak paneer',
      'shahi paneer',
      'paneer masala',
      'paneer curry',
    ],
    photo: 'paneerCurry',
  },
  {
    keys: [
      'dal makhani',
      'dal fry',
      'dal tadka',
      'yellow dal',
      'black dal',
      'sambar',
      'rasam',
    ],
    photo: 'dal',
  },
  { keys: ['rogan josh', 'mutton', 'lamb', 'keema'], photo: 'mutton' },
  {
    keys: [
      'chicken curry',
      'chicken gravy',
      'butter garlic chicken',
      'home style chicken',
    ],
    photo: 'chickenCurry',
  },
  {
    keys: ['chilli chicken', 'chili chicken', 'chicken 65', 'chicken lollipop'],
    photo: 'chilliChicken',
  },
  { keys: ['tandoori chicken', 'tandoori'], photo: 'kebab' },
  { keys: ['seekh', 'kebab', 'kabab', 'hara bhara'], photo: 'kebab' },
  { keys: ['biryani', 'dum biryani', 'hyderabadi'], photo: 'biryani' },
  { keys: ['fried rice'], photo: 'friedRice' },
  {
    keys: [
      'jeera rice',
      'steamed rice',
      'plain rice',
      'curd rice',
      'lemon rice',
    ],
    photo: 'rice',
  },
  { keys: ['manchurian'], photo: 'manchurian' },
  {
    keys: [
      'hakka noodle',
      'noodles',
      'chowmein',
      'chow mein',
      'pad thai',
      'schezwan noodle',
    ],
    photo: 'noodles',
  },
  { keys: ['spring roll'], photo: 'springRoll' },
  { keys: ['momo', 'dumpling'], photo: 'momos' },
  {
    keys: [
      'thai green curry',
      'thai red curry',
      'green curry',
      'red curry',
      'massaman',
    ],
    photo: 'thaiCurry',
  },
  { keys: ['garlic bread'], photo: 'garlicBread' },
  {
    keys: ['penne', 'alfredo', 'pasta', 'spaghetti', 'arrabiata', 'macaroni'],
    photo: 'pasta',
  },
  {
    keys: ['cheeseburger', 'chicken burger', 'veg burger', 'burger'],
    photo: 'burger',
  },
  {
    keys: [
      'french fries',
      'peri peri fries',
      'fries',
      'chilli potato',
      'chili potato',
    ],
    photo: 'fries',
  },
  { keys: ['chicken wing', 'wings'], photo: 'wings' },
  {
    keys: ['fish fry', 'fish curry', 'fish finger', 'prawn', 'seafood', 'fish'],
    photo: 'fish',
  },
  {
    keys: [
      'butter naan',
      'garlic naan',
      'plain naan',
      'naan',
      'kulcha',
      'roti',
      'chapati',
    ],
    photo: 'naan',
  },
  { keys: ['laccha paratha', 'paratha', 'parantha'], photo: 'paratha' },
  { keys: ['masala dosa', 'plain dosa', 'rava dosa', 'dosa'], photo: 'dosa' },
  { keys: ['idli', 'vada', 'medu vada'], photo: 'idli' },
  { keys: ['samosa'], photo: 'samosa' },
  {
    keys: ['pani puri', 'gol gappa', 'bhel', 'chaat', 'sev puri', 'dahi puri'],
    photo: 'chaat',
  },
  { keys: ['pav bhaji'], photo: 'pavBhaji' },
  { keys: ['thali'], photo: 'thali' },
  { keys: ['sandwich', 'club sandwich', 'grilled sandwich'], photo: 'sandwich' },
  { keys: ['salad', 'caesar'], photo: 'salad' },
  { keys: ['soup', 'shorba'], photo: 'soup' },
  {
    keys: ['cold coffee', 'cappuccino', 'latte', 'espresso', 'coffee'],
    photo: 'coffee',
  },
  { keys: ['masala chai', 'cutting chai', 'chai', 'tea'], photo: 'chai' },
  { keys: ['lassi', 'buttermilk', 'chaas', 'raita', 'boondi'], photo: 'lassi' },
  {
    keys: [
      'lime soda',
      'nimbu',
      'mojito',
      'soda',
      'mocktail',
      'juice',
      'lemonade',
    ],
    photo: 'soda',
  },
  { keys: ['milkshake', 'shake', 'smoothie'], photo: 'shake' },
  { keys: ['gulab jamun', 'rasgulla', 'jalebi', 'halwa'], photo: 'gulabJamun' },
  { keys: ['brownie'], photo: 'brownie' },
  { keys: ['ice cream', 'sundae', 'kulfi'], photo: 'iceCream' },
  { keys: ['cake', 'pastry', 'muffin'], photo: 'cake' },
  { keys: ['pancake', 'waffle'], photo: 'pancakes' },
  {
    keys: ['omelette', 'omelet', 'egg bhurji', 'boiled egg', 'egg'],
    photo: 'eggs',
  },
  { keys: ['steak', 'grill'], photo: 'steak' },
  { keys: ['paneer'], photo: 'paneerCurry' },
  { keys: ['chicken'], photo: 'chickenCurry' },
  { keys: ['veg', 'vegetable'], photo: 'salad' },
];

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pick a photo that matches the dish name. Never uses a random hash pool.
 */
export function menuItemImageForName(name) {
  const key = normalizeName(name);
  if (!key) return DISH_PHOTOS.plated;

  for (const rule of NAME_RULES) {
    if (rule.keys.some((k) => key.includes(k))) {
      return DISH_PHOTOS[rule.photo];
    }
  }

  return DISH_PHOTOS.plated;
}

/** Prefer a real partner upload; stock Unsplash/dummy URLs map by dish name. */
export function resolveMenuItemImage(name, imageUrl) {
  const trimmed = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  const isStock =
    !trimmed ||
    /unsplash\.com|picsum\.photos|via\.placeholder|placehold\.co|dummyimage|loremflickr/i.test(
      trimmed,
    );
  if (!isStock) return trimmed;
  return menuItemImageForName(name);
}

/** @deprecated kept for scripts that imported the pool */
export function getFoodImagePool() {
  return Object.values(DISH_PHOTOS);
}
