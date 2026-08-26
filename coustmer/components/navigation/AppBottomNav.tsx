import { Pressable } from '@/components/common/Pressable';
import type { Href } from 'expo-router';
import { usePathname, useRouter } from 'expo-router';
import {
  ClipboardList,
  Heart,
  Home,
  ShoppingBag,
  UserRound,
} from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@/constants/typography';
import { useCartSummary } from '@/lib/cart/hooks';
import { useCartStore } from '@/store/cart-store';

/** Space to leave above the floating tab bar on root tab screens. */
export const APP_BOTTOM_NAV_INSET = 80;

const ORANGE = '#F97316';
const IDLE_COLOR = '#9CA3AF';
const ACTIVE_COLOR = '#111827';

type Tab = {
  key: string;
  label: string;
  href: Href;
  match: (pathname: string) => boolean;
  Icon: typeof Home;
};

const TABS: Tab[] = [
  {
    key: 'home',
    label: 'Home',
    href: '/home',
    match: (p) => p === '/home' || p.endsWith('/home'),
    Icon: Home,
  },
  {
    key: 'saved',
    label: 'Saved',
    href: '/favorites',
    match: (p) => p === '/favorites' || p.endsWith('/favorites'),
    Icon: Heart,
  },
  // CENTER: Cart handled separately
  {
    key: 'orders',
    label: 'Orders',
    href: '/orders',
    match: (p) => p.startsWith('/orders'),
    Icon: ClipboardList,
  },
  {
    key: 'profile',
    label: 'Profile',
    href: '/profile',
    match: (p) => p === '/profile' || p.endsWith('/profile'),
    Icon: UserRound,
  },
];

function isCartPath(pathname: string) {
  return pathname === '/cart' || pathname.endsWith('/cart');
}

function isFavoritesPath(pathname: string) {
  return pathname === '/favorites' || pathname.endsWith('/favorites');
}

function isRestaurantsPath(pathname: string) {
  return pathname === '/restaurants' || /\/restaurants\/?$/.test(pathname);
}

export function isAppTabRoot(pathname: string): boolean {
  const path = pathname.split('?')[0] ?? pathname;
  if (isCartPath(path)) return false;
  return (
    isRestaurantsPath(path) ||
    isFavoritesPath(path) ||
    TABS.some((tab) => tab.match(path))
  );
}

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const localCartCount = useCartStore((s) => s.totalItems());
  const summary = useCartSummary(true);
  const cartCount =
    typeof summary.data?.itemCount === 'number'
      ? summary.data.itemCount
      : localCartCount;

  const path = pathname.split('?')[0] ?? pathname;
  const onTabRoot = isAppTabRoot(path);

  if (!onTabRoot) return null;

  const cartActive = isCartPath(path);

  const go = (href: Href) => {
    router.replace(href);
  };

  // Left 2 tabs: Home, Saved
  const leftTabs = TABS.slice(0, 2);
  // Right 2 tabs: Orders, Profile
  const rightTabs = TABS.slice(2);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View style={styles.bar}>
        {/* ── Left tabs ── */}
        {leftTabs.map((tab) => {
          const active = tab.match(path);
          const Icon = tab.Icon;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              onPress={() => go(tab.href)}
              style={styles.tab}
            >
              <Icon
                color={active ? ORANGE : IDLE_COLOR}
                size={22}
                strokeWidth={active ? 2.4 : 1.8}
                fill={active && tab.key === 'home' ? ORANGE : 'transparent'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  active && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}

        {/* ── Center Cart button ── */}
        <View style={styles.centerSlot}>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Cart"
            onPress={() => go('/cart')}
            style={[styles.cartBtn, cartActive && styles.cartBtnActive]}
          >
            <ShoppingBag
              color="#FFFFFF"
              size={24}
              strokeWidth={2.2}
            />
            {cartCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {cartCount > 9 ? '9+' : String(cartCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Text
            style={[
              styles.tabLabel,
              cartActive && styles.tabLabelActive,
              styles.cartLabel,
            ]}
          >
            Cart
          </Text>
        </View>

        {/* ── Right tabs ── */}
        {rightTabs.map((tab) => {
          const active = tab.match(path);
          const Icon = tab.Icon;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              onPress={() => go(tab.href)}
              style={styles.tab}
            >
              <Icon
                color={active ? ORANGE : IDLE_COLOR}
                size={22}
                strokeWidth={active ? 2.4 : 1.8}
              />
              <Text
                style={[
                  styles.tabLabel,
                  active && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 6,
    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },

  // ── Regular tab ──
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingBottom: 2,
    minWidth: 52,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: fonts.uiMedium,
    color: IDLE_COLOR,
  },
  tabLabelActive: {
    color: ORANGE,
    fontFamily: fonts.uiBold,
  },

  // ── Center cart ──
  centerSlot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingBottom: 2,
    minWidth: 64,
  },
  cartBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    marginTop: -22, // Lifts the cart button above the nav bar
    // Shadow
    shadowColor: ORANGE,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  cartBtnActive: {
    backgroundColor: '#EA580C',
    transform: [{ scale: 0.96 }],
  },
  cartLabel: {
    color: IDLE_COLOR,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: fonts.uiBold,
  },
});
