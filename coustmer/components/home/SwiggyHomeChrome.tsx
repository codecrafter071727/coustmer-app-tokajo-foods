import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, ChevronDown, MapPin, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SmoothPressable } from '@/components/common/SmoothPressable';
import { HomeOfferHeroBanner } from '@/components/home/HomeOfferHeroBanner';
import { fonts } from '@/constants/typography';
import type { HomeBanner } from '@/lib/customer/types';
import { useUnreadNotificationCount } from '@/lib/notification/hooks';
import { useUserProfile } from '@/lib/profile/hooks';
import { useAuthStore } from '@/store/auth-store';

type Props = {
  topInset?: number;
  greeting?: string;
  deliveryTitle: string;
  deliverySubtitle?: string;
  isDetectingLocation?: boolean;
  onLocationPress?: () => void;
  banners?: HomeBanner[];
};

const HERO_BODY = 236;

const SEARCH_HINTS = [
  'Search for “biryani”',
  'Search for “pizza”',
  'Search restaurants',
  'Search for “burger”',
  'Search for dishes',
];

/**
 * Offer hero up top · location left · profile right ·
 * search + notifications docked under Order now.
 */
export function SwiggyHomeChrome({
  topInset = 0,
  deliveryTitle,
  deliverySubtitle,
  isDetectingLocation,
  onLocationPress,
  banners = [],
}: Props) {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const profile = useUserProfile();
  const unreadNotifications = useUnreadNotificationCount({
    enabled: Boolean(token),
    refetchInterval: 12_000,
  });
  const unreadCount = unreadNotifications.data ?? 0;
  const photoUrl = profile.data?.profilePhotoUrl;
  const initials = (
    [authUser?.firstName, authUser?.lastName]
      .filter(Boolean)
      .map((p) => p![0])
      .join('') ||
    authUser?.email?.[0] ||
    'U'
  )
    .toUpperCase()
    .slice(0, 2);

  const [hintIndex, setHintIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setHintIndex((i) => (i + 1) % SEARCH_HINTS.length);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const heroH = HERO_BODY + topInset;
  const headline = isDetectingLocation
    ? 'Detecting location…'
    : deliveryTitle || 'Select location';

  return (
    <View style={styles.root}>
      <View style={[styles.heroShell, { height: heroH }]}>
        <HomeOfferHeroBanner
          banners={banners}
          height={heroH}
          contentTopPad={topInset + 52}
        />

        <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
          <SmoothPressable
            style={styles.locationWrap}
            onPress={onLocationPress}
            pressScale={0.98}
            accessibilityLabel="Change delivery location"
          >
            <View style={styles.pinCircle}>
              <MapPin color="#FC8019" size={15} strokeWidth={2.6} />
            </View>
            <View style={styles.locationTextWrap}>
              <View style={styles.headlineRow}>
                <Text style={styles.locationHeadline} numberOfLines={1}>
                  {headline}
                </Text>
                <ChevronDown color="#FFFFFF" size={17} strokeWidth={2.6} />
              </View>
              {deliverySubtitle ? (
                <Text style={styles.locationSubline} numberOfLines={1}>
                  {deliverySubtitle}
                </Text>
              ) : null}
            </View>
          </SmoothPressable>

          <SmoothPressable
            style={styles.avatarBtn}
            onPress={() => router.push('/profile')}
            accessibilityLabel="Profile"
          >
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </SmoothPressable>
        </View>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
  },
  heroShell: {
    position: 'relative',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    zIndex: 4,
  },
  locationWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: {
    flex: 1,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationHeadline: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationSubline: {
    marginTop: 1,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFF4EB',
  },
  avatar: {
    width: 38,
    height: 38,
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4EB',
  },
  avatarInitials: {
    color: '#FC8019',
    fontSize: 14,
    fontFamily: fonts.displayBold,
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
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
