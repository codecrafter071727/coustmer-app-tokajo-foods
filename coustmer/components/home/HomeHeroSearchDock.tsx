import { useRouter } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SmoothPressable } from '@/components/common/SmoothPressable';
import { fonts } from '@/constants/typography';

const SEARCH_HINTS = [
  'Search for “biryani”',
  'Search for “pizza”',
  'Search restaurants',
  'Search for “burger”',
  'Search for dishes',
];

type Props = {
  unreadCount: number;
  /** Glass style when docked inside the offer banner. */
  onBanner?: boolean;
};

/** Search + notification row (standalone or inside offer hero). */
export function HomeHeroSearchDock({ unreadCount, onBanner = false }: Props) {
  const router = useRouter();
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setHintIndex((i) => (i + 1) % SEARCH_HINTS.length);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={[styles.dock, onBanner && styles.dockOnBanner]}>
      <Pressable
        style={[styles.searchBox, onBanner && styles.searchOnBanner]}
        onPress={() => router.push('/search')}
        accessibilityRole="search"
      >
        <Search color="#FC8019" size={18} strokeWidth={2.4} />
        <Text style={styles.placeholder} numberOfLines={1}>
          {SEARCH_HINTS[hintIndex]}
        </Text>
      </Pressable>

      <SmoothPressable
        style={[styles.bellBtn, onBanner && styles.bellOnBanner]}
        onPress={() => router.push('/notifications')}
        pressScale={0.94}
        accessibilityLabel={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
      >
        <Bell color="#1C1C1C" size={19} strokeWidth={2.2} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        ) : null}
      </SmoothPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dockOnBanner: {
    marginTop: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchOnBanner: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  placeholder: {
    flex: 1,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellOnBanner: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FC8019',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: fonts.uiBold,
  },
});
