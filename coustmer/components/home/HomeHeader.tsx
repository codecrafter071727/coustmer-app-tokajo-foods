import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import {
  Bell,
  ChevronDown,
  Map,
  MapPin,
  Menu,
  Mic,
  Search,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authTheme } from '@/constants/auth-theme';
import { useUnreadNotificationCount } from '@/lib/notification/hooks';

type HeaderProps = {
  greeting: string;
  tier?: string;
  loyaltyPoints?: number;
  topInset?: number;
  deliveryTitle?: string;
  deliverySubtitle?: string;
  deliveryLine?: string;
  isDetectingLocation?: boolean;
  onLocationPress?: () => void;
  onMenuPress?: () => void;
  /** When false, search lives in the sticky chrome instead. */
  showSearch?: boolean;
};

const SEARCH_HINTS = [
  'Search by name & restaurant',
  'Search for “biryani”',
  'Search for “pizza”',
  'Search for restaurants',
  'Search for dishes',
  'Search for “burger”',
];

const HERO_FOOD =
  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&h=800&fit=crop&q=80';

export function HomeSearchBar({
  compact = false,
  onMapPress,
}: {
  compact?: boolean;
  onMapPress?: () => void;
}) {
  const router = useRouter();
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHintIndex((i) => (i + 1) % SEARCH_HINTS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={[styles.searchRow, compact && styles.searchRowCompact]}>
      <Pressable
        style={[styles.searchBar, compact && styles.searchBarCompact]}
        onPress={() => router.push('/search')}
        accessibilityRole="search"
        accessibilityLabel="Search for restaurants and dishes"
      >
        <Search color="#9CA3AF" size={18} strokeWidth={2.2} />
        <View style={styles.searchCopy}>
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            {SEARCH_HINTS[hintIndex]}
          </Text>
        </View>
        {!compact ? (
          <View style={styles.micWrap}>
            <Mic color={authTheme.brand} size={18} />
          </View>
        ) : null}
      </Pressable>

      <Pressable
        style={styles.mapBtn}
        onPress={onMapPress ?? (() => router.push('/restaurants'))}
        accessibilityLabel="Map and location"
      >
        <Map color={authTheme.brand} size={20} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

export function HomeHeader({
  greeting,
  tier,
  loyaltyPoints,
  topInset = 0,
  deliveryTitle,
  deliverySubtitle,
  deliveryLine = 'Set delivery address',
  isDetectingLocation = false,
  onLocationPress,
  onMenuPress,
  showSearch = true,
}: HeaderProps) {
  const router = useRouter();
  const unreadNotifications = useUnreadNotificationCount({
    refetchInterval: 12_000,
    enabled: true,
  });
  const unreadCount = unreadNotifications.data ?? 0;
  const title = deliveryTitle || deliveryLine;
  const subtitle = deliverySubtitle?.trim() || '';

  return (
    <View style={[styles.wrap, { paddingTop: topInset + 8 }]}>
      <View style={styles.heroBleed}>
        <Image
          source={{ uri: HERO_FOOD }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(12,8,10,0.72)', 'rgba(18,10,14,0.86)', 'rgba(14,6,10,0.94)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.topRow}>
        <View style={styles.circleBtnHidden} />

        <Pressable
          style={styles.locationCenter}
          hitSlop={6}
          onPress={onLocationPress ?? (() => { })}
        >
          <Text style={styles.locationLabel}>Delivery location</Text>
          <View style={styles.locationValueRow}>
            <MapPin color={authTheme.brand} size={14} fill={authTheme.brand} />
            <Text style={styles.locationValue} numberOfLines={1}>
              {isDetectingLocation ? 'Detecting…' : title}
            </Text>
            <ChevronDown color="rgba(255,255,255,0.75)" size={14} />
          </View>
          {subtitle && !isDetectingLocation ? (
            <Text style={styles.locationSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          style={styles.circleBtn}
          onPress={() => router.push({ pathname: '/notifications' } as Href)}
          accessibilityLabel="Notifications"
        >
          <Bell color="#FFFFFF" size={18} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.promoBlock}>
        <Text style={styles.promoTitle}>
          <Text style={styles.promoAccent}>15%</Text> EXTRA DISCOUNT
        </Text>
        <Text style={styles.promoSub}>Get your first order delivery free!</Text>
        {greeting ? (
          <Text style={styles.greetingSoft}>Hey {greeting}</Text>
        ) : null}
      </View>

      {showSearch ? (
        <HomeSearchBar onMapPress={onLocationPress} />
      ) : null}

      {tier ? (
        <View style={styles.loyaltyRow}>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{tier.toUpperCase()} MEMBER</Text>
          </View>
          <Text style={styles.pointsText}>{loyaltyPoints ?? 0} loyalty points</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    backgroundColor: '#12100F',
  },
  heroBleed: {
    ...StyleSheet.absoluteFill,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  circleBtnHidden: {
    width: 42,
    height: 42,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCenter: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  locationLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '500',
  },
  locationValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    maxWidth: '100%',
  },
  locationValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  locationSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 2,
    maxWidth: '100%',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: authTheme.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  promoBlock: {
    marginTop: 18,
    marginBottom: 4,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  promoAccent: {
    color: '#AC0F45',
  },
  promoSub: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    fontWeight: '500',
  },
  greetingSoft: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  searchRowCompact: {
    marginTop: 0,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  searchBarCompact: {
    paddingVertical: 12,
    shadowOpacity: 0.06,
  },
  searchPlaceholder: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  searchCopy: {
    flex: 1,
    minWidth: 0,
  },
  micWrap: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 10,
  },
  mapBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  loyaltyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  tierBadge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pointsText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
});
