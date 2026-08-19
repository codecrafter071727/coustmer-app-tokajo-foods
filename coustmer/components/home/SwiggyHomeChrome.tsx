import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, ChevronDown, MapPin, Search } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SmoothPressable } from '@/components/common/SmoothPressable';
import { fonts } from '@/constants/typography';
import type { Deal, HomeBanner } from '@/lib/customer/types';
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
  onMenuPress?: () => void;
  vegActive?: boolean;
  onVegPress?: () => void;
  banners?: HomeBanner[];
  deals?: Deal[];
  activeFilter?: string | null;
  onFilterPress?: (id: string) => void;
};

export function SwiggyHomeChrome({
  topInset = 0,
  deliveryTitle,
  deliverySubtitle,
  isDetectingLocation,
  onLocationPress,
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
  ).toUpperCase().slice(0, 2);

  const headline = isDetectingLocation
    ? 'Detecting location…'
    : deliveryTitle || 'Select location';
  const subline = deliverySubtitle;

  return (
    <View style={[styles.container, { paddingTop: topInset + 8 }]}>
      {/* ── Location + profile row ── */}
      <View style={styles.topBar}>
        <SmoothPressable
          style={styles.locationWrap}
          onPress={onLocationPress}
          pressScale={0.98}
          accessibilityLabel="Change delivery location"
        >
          <View style={styles.pinCircle}>
            <MapPin color="#F97316" size={16} strokeWidth={2.6} />
          </View>
          <View style={styles.locationTextWrap}>
            <View style={styles.headlineRow}>
              <Text style={styles.locationHeadline} numberOfLines={1}>
                {headline}
              </Text>
              <ChevronDown color="#1C1C1C" size={18} strokeWidth={2.6} />
            </View>
            {subline ? (
              <Text style={styles.locationSubline} numberOfLines={1}>
                {subline}
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
          {unreadCount > 0 ? <View style={styles.avatarDot} /> : null}
        </SmoothPressable>
      </View>

      {/* ── Search + notification ── */}
      <View style={styles.searchRow}>
        <Pressable style={styles.searchBox} onPress={() => router.push('/search')}>
          <Search color="#F97316" size={20} strokeWidth={2.4} />
          <Text style={styles.searchPlaceholder}>
            Search for restaurants and food
          </Text>
        </Pressable>

        <SmoothPressable
          style={styles.bellBtn}
          onPress={() => router.push('/notifications')}
          pressScale={0.94}
          accessibilityLabel={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
          }
        >
          <Bell color="#1C1C1C" size={21} strokeWidth={2.2} />
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
  container: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },

  // ── Location row ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 12,
  },
  locationWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF1E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: {
    flex: 1,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationHeadline: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1C',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  locationSubline: {
    marginTop: 1,
    fontSize: 12.5,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
  },
  avatar: {
    width: 40,
    height: 40,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1E6',
  },
  avatarInitials: {
    color: '#EA580C',
    fontSize: 15,
    fontFamily: fonts.displayBold,
    fontWeight: '800',
  },
  avatarDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F97316',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // ── Search row ──
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EDEDED',
  },
  searchPlaceholder: {
    flex: 1,
    color: '#9A9A9A',
    fontSize: 14.5,
    fontWeight: '500',
  },
  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#EDEDED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#F4F4F5',
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: fonts.uiBold,
    fontWeight: '800',
  },
});
