import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Archive,
  Bell,
  ChevronRight,
  CircleDollarSign,
  Edit2,
  Info,
  LogOut,
  MapPin,
  MonitorSmartphone,
  Phone,
  Receipt,
  Settings2,
  Smartphone,
  Star,
  Tag,
  Trash2,
  User,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@/constants/typography';
import { useDefaultSavedAddress } from '@/lib/address/hooks';
import { useCustomerProfile } from '@/lib/customer/hooks';
import { usePaymentWallet } from '@/lib/payment/hooks';
import { useUserProfile } from '@/lib/profile/hooks';
import { useAuthStore } from '@/store/auth-store';

const PAGE_BG = '#F7F7F7';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#202020';
const TEXT_MUTED = '#303030';
const ACCENT = '#FF9972';
const UI_LIGHT = '#EDEDED';

export function ProfileHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const profile = useUserProfile();
  const customerProfile = useCustomerProfile();
  const wallet = usePaymentWallet();
  const { defaultAddress } = useDefaultSavedAddress();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const user = profile.data;
  const displayName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    authUser?.firstName ||
    'Guest';

  const locationText = defaultAddress?.formattedAddress || 'No saved address';

  const onRefresh = () => {
    profile.refetch();
    customerProfile.refetch();
    wallet.refetch();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const points = customerProfile.data?.loyaltyPoints ?? 0;
  const balance = wallet.data?.balance ?? 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.navLeft}>
          <TouchableOpacity
            style={styles.iconCircle}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <User color={TEXT_DARK} size={20} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Profile</Text>
        </View>
        <TouchableOpacity
          style={styles.iconCircle}
          activeOpacity={0.7}
          onPress={() => router.push('/profile/preferences')}
        >
          <Bell color={TEXT_DARK} size={20} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={profile.isRefetching}
            onRefresh={onRefresh}
            tintColor={TEXT_DARK}
          />
        }
      >
        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <Image
              source={{
                uri:
                  user?.profilePhotoUrl ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
              }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.profileLocation} numberOfLines={1}>
                {locationText}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/profile/edit')}
          >
            <Edit2 color={TEXT_MUTED} size={20} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Orders & money</Text>
        <View style={styles.cardGroup}>
          <SettingRow
            icon={<Star color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Rewards"
            value={`${points} points`}
            onPress={() => router.push('/profile/referral')}
            hasChevron
          />
          <SettingRow
            icon={<Archive color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Your Orders"
            onPress={() => router.push('/orders' as any)}
            hasChevron
          />
          <SettingRow
            icon={<MapPin color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Addresses"
            onPress={() => router.push('/profile/addresses' as any)}
            hasChevron
          />
          <SettingRow
            icon={<CircleDollarSign color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Wallet"
            value={`₹${balance.toFixed(0)}`}
            onPress={() => router.push('/profile/wallet')}
            hasChevron
          />
          <SettingRow
            icon={<Receipt color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Vouchers"
            onPress={() => router.push('/deals')}
            hasChevron
          />
          <SettingRow
            icon={<Tag color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Refer & earn"
            onPress={() => router.push('/profile/referral')}
            hasChevron
            isLast
          />
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.cardGroup}>
          <SettingRow
            icon={<Phone color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Phone & email"
            onPress={() => router.push('/profile/contact')}
            hasChevron
          />
          <SettingRow
            icon={<Settings2 color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Preferences"
            onPress={() => router.push('/profile/preferences')}
            hasChevron
          />
          <SettingRow
            icon={<MonitorSmartphone color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Active sessions"
            onPress={() => router.push('/profile/sessions')}
            hasChevron
          />
          <SettingRow
            icon={<Smartphone color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Push devices"
            onPress={() => router.push('/profile/devices')}
            hasChevron
            isLast
          />
        </View>

        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.cardGroup}>
          <SettingRow
            icon={<Info color={TEXT_DARK} size={20} strokeWidth={1.8} />}
            label="Get Help"
            onPress={() => router.push('/support')}
            hasChevron
          />
          <SettingRow
            icon={<Trash2 color={ACCENT} size={20} strokeWidth={1.8} />}
            label="Delete account"
            onPress={() => router.push('/profile/delete-account')}
            hasChevron
            labelColor={ACCENT}
          />
          <SettingRow
            icon={<LogOut color={ACCENT} size={20} strokeWidth={1.8} />}
            label="Logout"
            onPress={handleLogout}
            hasChevron
            isLast
            labelColor={ACCENT}
          />
        </View>
        {isLoggingOut ? (
          <ActivityIndicator size="large" color={TEXT_DARK} style={{ marginTop: 20 }} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  hasChevron,
  onPress,
  labelColor,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  hasChevron?: boolean;
  isLast?: boolean;
  onPress: () => void;
  labelColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIconCircle}>{icon}</View>
        <Text style={[styles.rowLabel, labelColor ? { color: labelColor } : undefined]}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {hasChevron ? <ChevronRight color={UI_LIGHT} size={20} strokeWidth={2.5} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: TEXT_DARK,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  profileLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI_LIGHT,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: TEXT_DARK,
  },
  profileLocation: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: TEXT_MUTED,
    width: '50%',
  },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: UI_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 15,
    color: TEXT_DARK,
    marginLeft: 4,
    marginBottom: 12,
  },
  cardGroup: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PAGE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: fonts.displaySemi,
    fontSize: 15,
    color: TEXT_DARK,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    color: TEXT_MUTED,
  },
});
