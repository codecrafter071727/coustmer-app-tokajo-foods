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
};

/** Floating search + notification row under the offer hero. */
export function HomeHeroSearchDock({ unreadCount }: Props) {
  const router = useRouter();
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setHintIndex((i) => (i + 1) % SEARCH_HINTS.length);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.searchDock}>
      <Pressable
        style={styles.searchBox}
        onPress={() => router.push('/search')}
        accessibilityRole="search"
      >
        <Search color="#FC8019" size={19} strokeWidth={2.4} />
        <Text style={styles.searchPlaceholder} numberOfLines={1}>
          {SEARCH_HINTS[hintIndex]}
        </Text>
      </Pressable>

      <SmoothPressable
        style={styles.bellBtn}
        onPress={() => router.push('/notifications')}
        pressScale={0.94}
        accessibilityLabel={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
      >
        <Bell color="#1C1C1C" size={20} strokeWidth={2.2} />
        {unreadCount > 0 ? (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        ) : null}
      </SmoothPressable>
    </View>
  );
}

const cardShadow = {
  elevation: 5,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
} as const;

const styles = StyleSheet.create({
  searchDock: {
    marginTop: -20,
    marginHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 5,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    borderWidth: 1,
    borderColor: '#ECECEC',
    ...cardShadow,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#9A9A9A',
    fontSize: 14.5,
    fontWeight: '500',
  },
  bellBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  bellBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
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
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: fonts.uiBold,
  },
});
