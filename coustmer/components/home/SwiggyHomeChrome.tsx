import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SmoothPressable } from '@/components/common/SmoothPressable';
import { HomeHeroSearchDock } from '@/components/home/HomeHeroSearchDock';
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
  /** CMS / home feed offer slides — optional; fallback slide is used when empty. */
  banners?: HomeBanner[] | null;
};

const HERO_BODY = 268;
const SEARCH_DOCK_H = 64;

/**
 * Everything lives inside the offer banner:
 * location (left) · profile (right) · offer + Order now · search + bell.
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

  const topOverlayPad = topInset + 56;
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
          topOverlayPad={topOverlayPad}
          bottomOverlayPad={SEARCH_DOCK_H + 10}
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

        <View style={styles.searchOverlay}>
          <HomeHeroSearchDock unreadCount={unreadCount} onBanner />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  heroShell: {
    position: 'relative',
    overflow: 'hidden',
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
  searchOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    zIndex: 5,
  },
});
