import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, MapPin, Search, Sparkles } from 'lucide-react-native';
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

  const locationText = isDetectingLocation
    ? 'Detecting…'
    : deliverySubtitle
      ? deliverySubtitle
      : deliveryTitle;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Dark gradient background */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated circles for depth */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />

      {/* ── Top bar ──────────────────────────────────── */}
      <View style={styles.topBar}>
        <SmoothPressable
          style={styles.profileBtn}
          onPress={() => router.push('/profile')}
          accessibilityLabel="Profile"
        >
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={styles.profileAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.profileFallback}>
              <Text style={styles.profileInitials}>{initials}</Text>
            </View>
          )}
        </SmoothPressable>

        {/* Delivery location */}
        <SmoothPressable style={styles.locationWrap} onPress={onLocationPress} pressScale={0.97}>
          <View style={styles.locationPill}>
            <MapPin color="#EA580C" size={14} strokeWidth={2.5} fill="#FED7AA" />
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>Deliver to</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {locationText}
              </Text>
            </View>
          </View>
        </SmoothPressable>

        {/* Bell notification */}
        <SmoothPressable
          style={styles.iconCircle}
          onPress={() => router.push('/notifications')}
          accessibilityLabel={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
        >
          <Bell color="#1F2937" size={20} strokeWidth={2.2} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </SmoothPressable>
      </View>

      {/* ── Search bar ───────────────────────────────── */}
      <View style={styles.searchRow}>
        <Pressable
          style={styles.searchBox}
          onPress={() => router.push('/search')}
        >
          <Search color="#9CA3AF" size={20} strokeWidth={2.2} />
          <Text style={styles.searchPlaceholder}>
            Search for dishes, restaurants
          </Text>
        </Pressable>

        <SmoothPressable
          style={styles.sparkleBtn}
          onPress={() => router.push('/restaurants')}
          accessibilityLabel="Explore restaurants"
          pressScale={0.92}
        >
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sparkleBtnGrad}
          >
            <Sparkles color="#F59E0B" size={20} strokeWidth={2.2} fill="#FCD34D" />
          </LinearGradient>
        </SmoothPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },

  // Decorative circles
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -80,
    right: -60,
  },
  circle2: {
    width: 140,
    height: 140,
    bottom: -50,
    left: -30,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 0,
    gap: 10,
    zIndex: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: fonts.uiBold,
    fontWeight: '700',
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileAvatar: {
    width: 44,
    height: 44,
  },
  profileFallback: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCD34D',
  },
  profileInitials: {
    color: '#92400E',
    fontSize: 15,
    fontFamily: fonts.displayBold,
    fontWeight: '700',
  },
  locationWrap: {
    flex: 1,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 1,
  },
  locationText: {
    color: '#1F2937',
    fontSize: 14,
    fontFamily: fonts.displayBold,
    fontWeight: '700',
  },

  // ── Search ──
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    alignItems: 'center',
    marginTop: 16,
    zIndex: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '500',
  },
  sparkleBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  sparkleBtnGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
