import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, MapPin, Search, UtensilsCrossed } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SmoothPressable } from '@/components/common/SmoothPressable';
import { fonts } from '@/constants/typography';
import type { Deal, HomeBanner } from '@/lib/customer/types';
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
  const profile = useUserProfile();
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
      {/* Background hero image */}
      <Image
        source={{
          uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
        }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      {/* Dark overlay gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
        style={StyleSheet.absoluteFill}
      />

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
        <SmoothPressable style={styles.locationWrap} onPress={onLocationPress} pressScale={0.96}>
          <Text style={styles.locationLabel}>Delivery location</Text>
          <View style={styles.locationRow}>
            <MapPin color="#F97316" size={12} strokeWidth={3} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationText}
            </Text>
          </View>
        </SmoothPressable>

        {/* Bell notification */}
        <SmoothPressable
          style={styles.iconCircle}
          onPress={() => router.push('/notifications')}
        >
          <Bell color="#FFFFFF" size={20} strokeWidth={2.2} />
        </SmoothPressable>
      </View>

      {/* ── Hero promo ───────────────────────────────── */}
      <View style={styles.promoWrap}>
        {/* Big percentage row */}
        <View style={styles.promoAmountRow}>
          <Text style={styles.promoPercent}>15%</Text>
          <View style={styles.promoWords}>
            <Text style={styles.promoExtra}>EXTRA</Text>
            <Text style={styles.promoDiscount}>DISCOUNT</Text>
          </View>
        </View>
        <Text style={styles.promoSub}>
          Get your first order{'\n'}delivery free!
        </Text>
      </View>

      {/* ── Search bar ───────────────────────────────── */}
      <View style={styles.searchRow}>
        <Pressable
          style={styles.searchBox}
          onPress={() => router.push('/search')}
        >
          <Search color="#64748B" size={18} strokeWidth={2.4} />
          <Text style={styles.searchPlaceholder}>
            Search dishes, restaurants…
          </Text>
        </Pressable>

        <SmoothPressable
          style={styles.browseBtn}
          onPress={() => router.push('/restaurants')}
          accessibilityLabel="Browse all restaurants"
          pressScale={0.92}
        >
          <LinearGradient
            colors={['#FF8A4C', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.browseBtnGrad}
          >
            <UtensilsCrossed color="#FFFFFF" size={20} strokeWidth={2.4} />
          </LinearGradient>
        </SmoothPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    paddingBottom: 32,
    // Large rounded bottom corners
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
    gap: 8,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  profileAvatar: {
    width: 42,
    height: 42,
  },
  profileFallback: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  profileInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.4,
  },
  locationWrap: {
    flex: 1,
    alignItems: 'center',
  },
  locationLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 9,
    fontFamily: fonts.uiBold,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fonts.displayBold,
    maxWidth: 200,
  },

  // ── Promo block ──
  promoWrap: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  promoAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoPercent: {
    color: '#F97316',
    fontSize: 60,
    fontFamily: fonts.display,
    letterSpacing: -2,
    lineHeight: 66,
  },
  promoWords: {
    justifyContent: 'center',
    gap: 0,
  },
  promoExtra: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: fonts.display,
    letterSpacing: 1.5,
    lineHeight: 26,
  },
  promoDiscount: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: fonts.display,
    letterSpacing: 1.5,
    lineHeight: 26,
  },
  promoSub: {
    color: '#F3F4F6',
    fontSize: 17,
    fontFamily: fonts.uiMedium,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },

  // ── Search ──
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
    marginTop: 14, // Shifting search bar down slightly
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 52,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#475569',
    fontSize: 14,
    fontFamily: fonts.uiSemi,
  },
  browseBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  browseBtnGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
