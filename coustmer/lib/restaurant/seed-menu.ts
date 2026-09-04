import type { MenuCategory, MenuItem, RestaurantMenu } from '@/lib/restaurant/types';
import { menuItemImageForName } from '@/lib/restaurant/menu-item-images';

export type SeedDish = {
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  category: string;
  imageUrl: string;
  tags: string[];
};

const IMG = {
  butterChicken:
    'https://images.unsplash.com/photo-1603894584372-a7369195528d?w=600&h=450&fit=crop&q=80',
  paneerTikka:
    'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&h=450&fit=crop&q=80',
  biryani:
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&h=450&fit=crop&q=80',
  pizza:
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=450&fit=crop&q=80',
  burger:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=450&fit=crop&q=80',
  seekh:
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f3?w=600&h=450&fit=crop&q=80',
  springRoll:
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=450&fit=crop&q=80',
  chilliPotato:
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&h=450&fit=crop&q=80',
  wings:
    'https://images.unsplash.com/photo-1527477396000-e2717f6f4c83?w=600&h=450&fit=crop&q=80',
  haraBhara:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=450&fit=crop&q=80',
  chilliChicken:
    'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&h=450&fit=crop&q=80',
  dalMakhani:
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=450&fit=crop&q=80',
  kadhaiPaneer:
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&h=450&fit=crop&q=80',
  chickenCurry:
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&h=450&fit=crop&q=80',
  roganJosh:
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&h=450&fit=crop&q=80',
  manchurian:
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&h=450&fit=crop&q=80',
  fishFry:
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=450&fit=crop&q=80',
  naan:
    'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&h=450&fit=crop&q=80',
  paratha:
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=450&fit=crop&q=80',
  jeeraRice:
    'https://images.unsplash.com/photo-1516684732701-375e770c5a3a?w=600&h=450&fit=crop&q=80',
  friedRice:
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&h=450&fit=crop&q=80',
  chai:
    'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&h=450&fit=crop&q=80',
  coldCoffee:
    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=450&fit=crop&q=80',
  limeSoda:
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=450&fit=crop&q=80',
  lassi:
    'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&h=450&fit=crop&q=80',
  gulabJamun:
    'https://images.unsplash.com/photo-1666190092159-3171d1c91a3a?w=600&h=450&fit=crop&q=80',
  brownie:
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&h=450&fit=crop&q=80',
  iceCream:
    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=450&fit=crop&q=80',
  cake:
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=450&fit=crop&q=80',
  dosa:
    'https://images.unsplash.com/photo-1585937421612-70a008296fbe?w=600&h=450&fit=crop&q=80',
  idli:
    'https://images.unsplash.com/photo-1529042410759-b3871200bafc?w=600&h=450&fit=crop&q=80',
  samosa:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=450&fit=crop&q=80',
  paniPuri:
    'https://images.unsplash.com/photo-1606491956689-2ea866258177?w=600&h=450&fit=crop&q=80',
  pavBhaji:
    'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=450&fit=crop&q=80',
  thali:
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=450&fit=crop&q=80',
  pasta:
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&h=450&fit=crop&q=80',
  noodles:
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=450&fit=crop&q=80',
  momos:
    'https://images.unsplash.com/photo-1496116218417-1a781b1d4160?w=600&h=450&fit=crop&q=80',
  tandoori:
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f3?w=600&h=450&fit=crop&q=80',
  shake:
    'https://images.unsplash.com/photo-1572490122747-3964b21cbd70?w=600&h=450&fit=crop&q=80',
  sandwich:
    'https://images.unsplash.com/photo-1528735602780-2552fd466c7d?w=600&h=450&fit=crop&q=80',
  salad:
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=450&fit=crop&q=80',
};

/** Shared dish library tagged by cuisine/theme */
const DISH_LIBRARY: SeedDish[] = [
  // North Indian / Tandoor
  { name: 'Butter Chicken', description: 'Creamy tomato gravy with tender chicken', price: 320, isVeg: false, category: 'Recommended', imageUrl: IMG.butterChicken, tags: ['north', 'tandoor', 'multi', 'curry', 'thali'] },
  { name: 'Paneer Tikka Masala', description: 'Char-grilled paneer in spiced tomato-cashew sauce', price: 280, isVeg: true, category: 'Recommended', imageUrl: IMG.paneerTikka, tags: ['north', 'tandoor', 'multi', 'punjabi', 'thali'] },
  { name: 'Dal Makhani', description: 'Slow-cooked black lentils with butter & cream', price: 240, isVeg: true, category: 'Main Course', imageUrl: IMG.dalMakhani, tags: ['north', 'punjabi', 'tandoor', 'thali', 'multi'] },
  { name: 'Kadhai Paneer', description: 'Paneer with bell peppers in kadhai masala', price: 270, isVeg: true, category: 'Main Course', imageUrl: IMG.kadhaiPaneer, tags: ['north', 'punjabi', 'tandoor', 'thali'] },
  { name: 'Chicken Curry', description: 'Home-style chicken in onion-tomato gravy', price: 310, isVeg: false, category: 'Main Course', imageUrl: IMG.chickenCurry, tags: ['north', 'curry', 'multi', 'thali'] },
  { name: 'Mutton Rogan Josh', description: 'Kashmiri-style braised mutton', price: 399, isVeg: false, category: 'Main Course', imageUrl: IMG.roganJosh, tags: ['north', 'mughlai', 'curry', 'biryani'] },
  { name: 'Tandoori Chicken (Half)', description: 'Clay oven roasted chicken with spices', price: 349, isVeg: false, category: 'Starters', imageUrl: IMG.tandoori, tags: ['tandoor', 'north', 'punjabi', 'multi'] },
  { name: 'Chicken Seekh Kebab', description: 'Minced chicken skewers with mint chutney', price: 260, isVeg: false, category: 'Starters', imageUrl: IMG.seekh, tags: ['tandoor', 'north', 'multi', 'punjabi'] },
  { name: 'Hara Bhara Kebab', description: 'Spinach & peas patties with Indian spices', price: 210, isVeg: true, category: 'Starters', imageUrl: IMG.haraBhara, tags: ['north', 'tandoor', 'multi', 'thali'] },
  { name: 'Butter Naan', description: 'Tandoor-baked naan brushed with butter', price: 60, isVeg: true, category: 'Breads & Rice', imageUrl: IMG.naan, tags: ['north', 'tandoor', 'punjabi', 'thali', 'multi'] },
  { name: 'Garlic Naan', description: 'Naan topped with garlic & coriander', price: 70, isVeg: true, category: 'Breads & Rice', imageUrl: IMG.naan, tags: ['north', 'tandoor', 'punjabi', 'multi'] },
  { name: 'Laccha Paratha', description: 'Multi-layered whole wheat paratha', price: 65, isVeg: true, category: 'Breads & Rice', imageUrl: IMG.paratha, tags: ['north', 'punjabi', 'thali', 'tandoor'] },
  { name: 'Jeera Rice', description: 'Fragrant basmati rice with cumin', price: 150, isVeg: true, category: 'Breads & Rice', imageUrl: IMG.jeeraRice, tags: ['north', 'thali', 'multi', 'curry'] },

  // Biryani / Mughlai
  { name: 'Hyderabadi Chicken Biryani', description: 'Layered basmati rice with spiced chicken', price: 349, isVeg: false, category: 'Recommended', imageUrl: IMG.biryani, tags: ['biryani', 'mughlai', 'multi'] },
  { name: 'Mutton Dum Biryani', description: 'Slow-cooked mutton biryani with saffron', price: 429, isVeg: false, category: 'Recommended', imageUrl: IMG.biryani, tags: ['biryani', 'mughlai'] },
  { name: 'Paneer Biryani', description: 'Aromatic veg biryani with paneer cubes', price: 279, isVeg: true, category: 'Main Course', imageUrl: IMG.biryani, tags: ['biryani', 'multi'] },
  { name: 'Egg Biryani', description: 'Spiced rice with boiled eggs & masala', price: 229, isVeg: false, category: 'Main Course', imageUrl: IMG.biryani, tags: ['biryani'] },
  { name: 'Chicken 65 Biryani Bowl', description: 'Crispy chicken 65 on flavoured rice', price: 299, isVeg: false, category: 'Main Course', imageUrl: IMG.biryani, tags: ['biryani', 'south'] },
  { name: 'Raita (Boondi)', description: 'Cool yogurt with boondi & spices', price: 69, isVeg: true, category: 'Sides', imageUrl: IMG.lassi, tags: ['biryani', 'north', 'thali'] },
  { name: 'Mirchi Ka Salan', description: 'Hyderabadi chilli curry side', price: 89, isVeg: true, category: 'Sides', imageUrl: IMG.dalMakhani, tags: ['biryani', 'mughlai'] },

  // Chinese / Thai
  { name: 'Chilli Chicken Dry', description: 'Indo-Chinese boneless chicken with peppers', price: 290, isVeg: false, category: 'Recommended', imageUrl: IMG.chilliChicken, tags: ['chinese', 'thai', 'multi', 'street'] },
  { name: 'Veg Manchurian Gravy', description: 'Crispy veg balls in spicy gravy', price: 230, isVeg: true, category: 'Main Course', imageUrl: IMG.manchurian, tags: ['chinese', 'multi', 'street', 'thai'] },
  { name: 'Hakka Noodles', description: 'Wok-tossed noodles with vegetables', price: 210, isVeg: true, category: 'Main Course', imageUrl: IMG.noodles, tags: ['chinese', 'thai', 'multi', 'street'] },
  { name: 'Chicken Fried Rice', description: 'Classic fried rice with chicken', price: 230, isVeg: false, category: 'Main Course', imageUrl: IMG.friedRice, tags: ['chinese', 'multi', 'street'] },
  { name: 'Veg Fried Rice', description: 'Wok fried rice with mixed vegetables', price: 190, isVeg: true, category: 'Main Course', imageUrl: IMG.friedRice, tags: ['chinese', 'multi', 'street', 'south'] },
  { name: 'Crispy Spring Rolls', description: 'Golden fried rolls with sweet chilli dip', price: 180, isVeg: true, category: 'Starters', imageUrl: IMG.springRoll, tags: ['chinese', 'thai', 'multi'] },
  { name: 'Veg Momos (8 pcs)', description: 'Steamed dumplings with spicy chutney', price: 149, isVeg: true, category: 'Starters', imageUrl: IMG.momos, tags: ['chinese', 'street', 'cafe'] },
  { name: 'Chicken Momos (8 pcs)', description: 'Juicy chicken momos, steamed or fried', price: 179, isVeg: false, category: 'Starters', imageUrl: IMG.momos, tags: ['chinese', 'street'] },
  { name: 'Thai Green Curry', description: 'Coconut curry with vegetables & basil', price: 320, isVeg: true, category: 'Main Course', imageUrl: IMG.chilliChicken, tags: ['thai'] },
  { name: 'Pad Thai Noodles', description: 'Thai stir-fried rice noodles with peanuts', price: 290, isVeg: false, category: 'Main Course', imageUrl: IMG.noodles, tags: ['thai'] },

  // Pizza / Italian
  { name: 'Margherita Pizza', description: 'Mozzarella, basil & tomato on thin crust', price: 299, isVeg: true, category: 'Recommended', imageUrl: IMG.pizza, tags: ['pizza', 'italian', 'cafe', 'multi'] },
  { name: 'Farmhouse Pizza', description: 'Loaded with capsicum, corn & olives', price: 349, isVeg: true, category: 'Pizza', imageUrl: IMG.pizza, tags: ['pizza', 'italian'] },
  { name: 'Chicken BBQ Pizza', description: 'Smoky BBQ chicken on cheese crust', price: 399, isVeg: false, category: 'Pizza', imageUrl: IMG.pizza, tags: ['pizza', 'italian', 'multi'] },
  { name: 'Paneer Tikka Pizza', description: 'Indian-style paneer tikka topping', price: 379, isVeg: true, category: 'Pizza', imageUrl: IMG.pizza, tags: ['pizza', 'italian', 'north'] },
  { name: 'Penne Arrabiata', description: 'Penne in spicy tomato sauce', price: 279, isVeg: true, category: 'Main Course', imageUrl: IMG.pasta, tags: ['italian', 'cafe', 'multi'] },
  { name: 'Alfredo Pasta', description: 'Creamy white sauce pasta with herbs', price: 299, isVeg: true, category: 'Main Course', imageUrl: IMG.pasta, tags: ['italian', 'cafe'] },
  { name: 'Garlic Bread (4 pcs)', description: 'Toasted bread with garlic butter', price: 129, isVeg: true, category: 'Starters', imageUrl: IMG.pizza, tags: ['pizza', 'italian', 'cafe'] },

  // Burger / Fast food
  { name: 'Classic Cheeseburger', description: 'Juicy patty with cheddar & house sauce', price: 249, isVeg: false, category: 'Recommended', imageUrl: IMG.burger, tags: ['burger', 'fast', 'multi', 'cafe', 'street'] },
  { name: 'Crispy Chicken Burger', description: 'Fried chicken fillet with mayo & lettuce', price: 269, isVeg: false, category: 'Burgers', imageUrl: IMG.burger, tags: ['burger', 'fast', 'multi'] },
  { name: 'Veg Supreme Burger', description: 'Grilled veg patty with cheese & veggies', price: 219, isVeg: true, category: 'Burgers', imageUrl: IMG.burger, tags: ['burger', 'fast', 'cafe'] },
  { name: 'Chicken Wings (6 pcs)', description: 'BBQ glazed crispy wings', price: 279, isVeg: false, category: 'Starters', imageUrl: IMG.wings, tags: ['burger', 'fast', 'multi', 'restro'] },
  { name: 'French Fries', description: 'Crispy golden fries with seasoning', price: 129, isVeg: true, category: 'Sides', imageUrl: IMG.chilliPotato, tags: ['burger', 'fast', 'cafe', 'multi'] },
  { name: 'Honey Chilli Potatoes', description: 'Crispy potatoes in honey chilli sauce', price: 199, isVeg: true, category: 'Starters', imageUrl: IMG.chilliPotato, tags: ['fast', 'chinese', 'street', 'multi'] },

  // South Indian
  { name: 'Masala Dosa', description: 'Crispy dosa with spiced potato filling', price: 149, isVeg: true, category: 'Recommended', imageUrl: IMG.dosa, tags: ['south', 'cafe', 'juice'] },
  { name: 'Plain Dosa', description: 'Classic crispy rice crepe with chutney', price: 99, isVeg: true, category: 'South Indian', imageUrl: IMG.dosa, tags: ['south', 'juice'] },
  { name: 'Idli Sambar (3 pcs)', description: 'Steamed rice cakes with sambar & chutney', price: 89, isVeg: true, category: 'South Indian', imageUrl: IMG.idli, tags: ['south', 'juice'] },
  { name: 'Medu Vada (2 pcs)', description: 'Crispy lentil donuts with coconut chutney', price: 79, isVeg: true, category: 'South Indian', imageUrl: IMG.idli, tags: ['south'] },
  { name: 'Uttapam Onion', description: 'Thick rice pancake topped with onions', price: 129, isVeg: true, category: 'South Indian', imageUrl: IMG.dosa, tags: ['south'] },
  { name: 'Filter Coffee', description: 'Traditional South Indian filter kaapi', price: 49, isVeg: true, category: 'Beverages', imageUrl: IMG.chai, tags: ['south', 'juice', 'cafe'] },

  // Street / Chaat
  { name: 'Pani Puri (6 pcs)', description: 'Crisp puris with tangy mint water', price: 79, isVeg: true, category: 'Recommended', imageUrl: IMG.paniPuri, tags: ['chaat', 'street'] },
  { name: 'Aloo Tikki Chaat', description: 'Spiced potato patties with chutneys & yogurt', price: 99, isVeg: true, category: 'Chaat', imageUrl: IMG.paniPuri, tags: ['chaat', 'street'] },
  { name: 'Pav Bhaji', description: 'Buttery mashed veg curry with pav', price: 149, isVeg: true, category: 'Recommended', imageUrl: IMG.pavBhaji, tags: ['chaat', 'street', 'fast'] },
  { name: 'Samosa (2 pcs)', description: 'Crispy pastry with spiced potato filling', price: 49, isVeg: true, category: 'Snacks', imageUrl: IMG.samosa, tags: ['chaat', 'street', 'cafe', 'juice'] },
  { name: 'Veg Sandwich Grill', description: 'Grilled sandwich with chutney & veggies', price: 119, isVeg: true, category: 'Snacks', imageUrl: IMG.sandwich, tags: ['street', 'cafe', 'juice'] },
  { name: 'Dahi Bhalla', description: 'Lentil dumplings in sweet yogurt', price: 89, isVeg: true, category: 'Chaat', imageUrl: IMG.paniPuri, tags: ['chaat', 'street'] },

  // Thali
  { name: 'Veg Thali Deluxe', description: 'Dal, sabzi, roti, rice, salad & sweet', price: 249, isVeg: true, category: 'Recommended', imageUrl: IMG.thali, tags: ['thali', 'north', 'punjabi'] },
  { name: 'Non-Veg Thali', description: 'Chicken curry, dal, roti, rice & raita', price: 329, isVeg: false, category: 'Recommended', imageUrl: IMG.thali, tags: ['thali', 'north'] },
  { name: 'Mini Veg Thali', description: 'Compact thali with 2 sabzi & roti', price: 179, isVeg: true, category: 'Thali', imageUrl: IMG.thali, tags: ['thali'] },
  { name: 'Rajasthani Thali', description: 'Dal baati, churma, gatte ki sabzi', price: 299, isVeg: true, category: 'Thali', imageUrl: IMG.thali, tags: ['thali', 'north'] },

  // Beverages
  { name: 'Masala Chai', description: 'Strong tea with ginger & cardamom', price: 49, isVeg: true, category: 'Beverages', imageUrl: IMG.chai, tags: ['cafe', 'juice', 'multi', 'street', 'north', 'thali'] },
  { name: 'Cold Coffee', description: 'Blended coffee with ice cream', price: 129, isVeg: true, category: 'Beverages', imageUrl: IMG.coldCoffee, tags: ['cafe', 'juice', 'multi', 'restro'] },
  { name: 'Fresh Lime Soda', description: 'Sweet or salted lime soda', price: 79, isVeg: true, category: 'Beverages', imageUrl: IMG.limeSoda, tags: ['juice', 'cafe', 'multi', 'street', 'chaat'] },
  { name: 'Mango Lassi', description: 'Thick yogurt smoothie with mango', price: 119, isVeg: true, category: 'Beverages', imageUrl: IMG.lassi, tags: ['north', 'punjabi', 'juice', 'multi', 'thali'] },
  { name: 'Strawberry Shake', description: 'Fresh strawberry milkshake', price: 149, isVeg: true, category: 'Beverages', imageUrl: IMG.shake, tags: ['juice', 'cafe'] },
  { name: 'Mixed Fruit Juice', description: 'Fresh seasonal fruit blend', price: 129, isVeg: true, category: 'Beverages', imageUrl: IMG.limeSoda, tags: ['juice'] },
  { name: 'Watermelon Juice', description: 'Chilled fresh watermelon juice', price: 99, isVeg: true, category: 'Beverages', imageUrl: IMG.shake, tags: ['juice'] },
  { name: 'Soft Drink (Can)', description: 'Chilled canned soft drink', price: 60, isVeg: true, category: 'Beverages', imageUrl: IMG.limeSoda, tags: ['multi', 'fast', 'burger', 'pizza'] },

  // Desserts
  { name: 'Gulab Jamun (2 pcs)', description: 'Milk dumplings in rose syrup', price: 99, isVeg: true, category: 'Desserts', imageUrl: IMG.gulabJamun, tags: ['north', 'thali', 'multi', 'biryani', 'street'] },
  { name: 'Chocolate Brownie', description: 'Warm fudgy brownie with sauce', price: 149, isVeg: true, category: 'Desserts', imageUrl: IMG.brownie, tags: ['cafe', 'multi', 'restro', 'juice'] },
  { name: 'Ice Cream Sundae', description: 'Vanilla & chocolate with nuts', price: 159, isVeg: true, category: 'Desserts', imageUrl: IMG.iceCream, tags: ['cafe', 'juice', 'multi', 'pizza'] },
  { name: 'Chocolate Cake Slice', description: 'Rich layered chocolate cake', price: 169, isVeg: true, category: 'Desserts', imageUrl: IMG.cake, tags: ['cafe', 'juice', 'bakery'] },
  { name: 'Rasmalai (2 pcs)', description: 'Soft paneer discs in saffron milk', price: 129, isVeg: true, category: 'Desserts', imageUrl: IMG.gulabJamun, tags: ['north', 'biryani', 'thali'] },

  // Restro / Multi extras
  { name: 'Fish Fry', description: 'Crispy spiced fish fillets', price: 340, isVeg: false, category: 'Starters', imageUrl: IMG.fishFry, tags: ['restro', 'multi', 'continental'] },
  { name: 'Caesar Salad', description: 'Romaine, croutons, parmesan & dressing', price: 249, isVeg: true, category: 'Starters', imageUrl: IMG.salad, tags: ['restro', 'continental', 'multi'] },
  { name: 'Grilled Chicken Steak', description: 'Herb-marinated grilled chicken breast', price: 449, isVeg: false, category: 'Main Course', imageUrl: IMG.chickenCurry, tags: ['restro', 'continental'] },
];

type MenuProfile =
  | 'biryani'
  | 'pizza'
  | 'chaat'
  | 'juice'
  | 'tandoor'
  | 'thali'
  | 'south'
  | 'chinese'
  | 'restro'
  | 'multi';

const CATEGORY_ORDER = [
  'Recommended',
  'Starters',
  'Main Course',
  'Pizza',
  'Burgers',
  'Biryani',
  'South Indian',
  'Chaat',
  'Snacks',
  'Thali',
  'Breads & Rice',
  'Sides',
  'Beverages',
  'Desserts',
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function hashNum(input: string) {
  return input.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

/** Detect menu style from restaurant name + cuisines */
export function detectMenuProfile(
  name: string,
  cuisines?: string[]
): MenuProfile {
  const n = name.toLowerCase();
  const c = (cuisines ?? []).join(' ').toLowerCase();

  if (n.includes('biryani') || c.includes('biryani')) return 'biryani';
  if (n.includes('pizza') || c.includes('pizza')) return 'pizza';
  if (n.includes('chaat') || n.includes('puri')) return 'chaat';
  if (n.includes('juice') || n.includes('shake')) return 'juice';
  if (n.includes('tandoor') || n.includes('tandoori')) return 'tandoor';
  if (n.includes('thali')) return 'thali';
  if (n.includes('dosa') || (c.includes('south indian') && !c.includes('fast'))) return 'south';
  if (c.includes('thai') || (c.includes('chinese') && !c.includes('north'))) return 'chinese';
  if (n.includes('restro') || n.includes('bar') || c.includes('continental')) return 'restro';
  if (c.includes('mughlai')) return 'biryani';
  if (c.includes('italian') && !c.includes('pizza')) return 'pizza';
  if (c.includes('street') && c.includes('fast')) return 'chaat';
  if (c.includes('punjabi') || c.includes('north indian')) return 'tandoor';
  if (c.includes('south indian')) return 'south';
  if (c.includes('chinese')) return 'chinese';
  if (c.includes('fast food') || c.includes('burger')) return 'multi';
  return 'multi';
}

const PROFILE_TAGS: Record<MenuProfile, string[]> = {
  biryani: ['biryani', 'mughlai', 'north', 'multi'],
  pizza: ['pizza', 'italian', 'cafe', 'multi'],
  chaat: ['chaat', 'street', 'fast', 'juice'],
  juice: ['juice', 'cafe', 'south', 'bakery', 'street'],
  tandoor: ['tandoor', 'north', 'punjabi', 'thali', 'multi'],
  thali: ['thali', 'north', 'punjabi', 'multi'],
  south: ['south', 'juice', 'cafe'],
  chinese: ['chinese', 'thai', 'street', 'multi'],
  restro: ['restro', 'multi', 'continental', 'north', 'chinese', 'italian'],
  multi: ['multi', 'north', 'chinese', 'fast', 'street', 'cafe', 'burger'],
};

function pickDishesForProfile(
  profile: MenuProfile,
  restaurantId: string,
  restaurantName: string
): SeedDish[] {
  const tags = PROFILE_TAGS[profile];
  const hash = hashNum(restaurantId + restaurantName);

  const scored = DISH_LIBRARY.map((dish) => {
    const matchCount = dish.tags.filter((t) => tags.includes(t)).length;
    const tieBreak = (hash + dish.name.charCodeAt(0)) % 100;
    return { dish, score: matchCount * 100 + tieBreak };
  });

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const picked: SeedDish[] = [];

  for (const { dish } of scored) {
    if (seen.has(dish.name)) continue;
    if (dish.tags.some((t) => tags.includes(t)) || picked.length < 8) {
      seen.add(dish.name);
      picked.push(dish);
    }
    if (picked.length >= 32) break;
  }

  // Ensure minimum per major category
  for (const cat of ['Recommended', 'Starters', 'Main Course', 'Beverages', 'Desserts']) {
    if (!picked.some((d) => d.category === cat)) {
      const fallback = DISH_LIBRARY.find((d) => d.category === cat);
      if (fallback && !seen.has(fallback.name)) {
        seen.add(fallback.name);
        picked.push(fallback);
      }
    }
  }

  return picked.slice(0, 32);
}

function priceVariation(base: number, restaurantId: string, dishName: string) {
  const h = hashNum(restaurantId + dishName) % 41;
  const delta = h - 20;
  const adjusted = base + Math.round(delta / 5) * 5;
  return Math.max(49, adjusted);
}

export function buildSeedMenu(
  restaurantId: string,
  options?: { name?: string; cuisines?: string[] }
): RestaurantMenu {
  const profile = detectMenuProfile(options?.name ?? '', options?.cuisines);
  const dishes = pickDishesForProfile(profile, restaurantId, options?.name ?? '');

  const categorySet = new Set(dishes.map((d) => d.category));
  const orderedCategories = CATEGORY_ORDER.filter((c) => categorySet.has(c));
  const extra = [...categorySet].filter((c) => !orderedCategories.includes(c));
  const categoryNames = [...orderedCategories, ...extra];

  const categories: MenuCategory[] = categoryNames.map((name) => ({
    id: slugify(name),
    name,
  }));

  const items: MenuItem[] = dishes.map((dish) => ({
    id: `seed-${restaurantId}-${slugify(dish.name)}`,
    name: dish.name,
    description: dish.description,
    price: priceVariation(dish.price, restaurantId, dish.name),
    imageUrl: menuItemImageForName(dish.name),
    categoryId: slugify(dish.category),
    categoryName: dish.category,
    isVeg: dish.isVeg,
    isAvailable: true,
    rating: 3.8 + ((hashNum(restaurantId + dish.name) % 12) / 10),
  }));

  return { categories, items };
}

export function findSeedMenuItem(
  restaurantId: string,
  itemId: string,
  options?: { name?: string; cuisines?: string[] }
): MenuItem | null {
  const menu = buildSeedMenu(restaurantId, options);
  return menu.items.find((item) => item.id === itemId) ?? null;
}
