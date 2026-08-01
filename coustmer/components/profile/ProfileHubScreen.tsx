import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Gift,
  Headset,
  LogOut,
  MapPin,
  MonitorSmartphone,
  Phone,
  Receipt,
  Settings2,
  Smartphone,
  Ticket,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_BOTTOM_NAV_INSET } from '@/components/navigation/AppBottomNav';
import { fonts } from '@/constants/typography';
import { formatAddressLabel } from '@/lib/address/types';
import { useDefaultSavedAddress } from '@/lib/address/hooks';
import { useCustomerProfile } from '@/lib/customer/hooks';
import { useOrders } from '@/lib/order/hooks';
import { usePaymentWallet } from '@/lib/payment/hooks';
import { useUserProfile } from '@/lib/profile/hooks';
import { useAuthStore } from '@/store/auth-store';
import { useDeliveryLocationStore } from '@/store/delivery-location-store';

const ORANGE = '#F3744B';
const INK = '#1A1A1A';
const MUTED = '#6B7280';
const FAINT = '#9CA3AF';
const LINE = '#EFEFEF';
const WHITE = '#FFFFFF';
const PAGE = '#F6F6F6';

type IconType = React.ComponentType<{
  color: string;
  size: number;
  strokeWidth?: number;
}>;

export function ProfileHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const profile = useUserProfile();
  const customerProfile = useCustomerProfile();
  const wallet = usePaymentWallet();
  const orders = useOrders({ page: 1, limit: 50 });
  const { defaultAddress } = useDefaultSavedAddress();
  const deliveryLocation = useDeliveryLocationStore((s) => s.location);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const user = profile.data;
  const displayName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    authUser?.firstName ||
    'Guest';

  const phone =
    user?.phone || (authUser as { phone?: string } | null)?.phone || '';
  const email = user?.email || '';

  // Prefer the live delivery pin (same as home/cart), then saved default.
  const addressLabel = formatAddressLabel(
    deliveryLocation?.label || defaultAddress?.label
  );
  const addressLine =
    deliveryLocation?.formattedAddress?.trim() ||
    defaultAddress?.formattedAddress?.trim() ||
    [
      defaultAddress?.street,
      defaultAddress?.area,
      defaultAddress?.city,
      defaultAddress?.pincode,
    ]
      .filter(Boolean)
      .join(', ') ||
    '';
  const hasAddress = Boolean(addressLine);

  const points = customerProfile.data?.loyaltyPoints ?? 0;
  const balance = wallet.data?.balance ?? 0;
  const orderCount =
    typeof orders.data?.meta?.total === 'number'
      ? orders.data.meta.total
      : (orders.data?.orders?.length ?? 0);

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const onRefresh = () => {
    void profile.refetch();
    void customerProfile.refetch();
    void wallet.refetch();
    void orders.refetch();
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  const handleLogout = () => {
    Alert.alert('Log out?', 'You’ll need to sign in again to place orders.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
            router.replace('/login');
          } catch (e) {
            console.error(e);
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + APP_BOTTOM_NAV_INSET + 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={profile.isRefetching}
            onRefresh={onRefresh}
            tintColor={ORANGE}
          />
        }
      >
        {/* Identity band */}
        <LinearGradient
          colors={['#FFE8D9', '#FFF5EE', PAGE]}
          locations={[0, 0.55, 1]}
          style={[styles.identity, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.topBar}>
            <Pressable style={styles.backBtn} onPress={goBack} hitSlop={8}>
              <ArrowLeft color={INK} size={20} strokeWidth={2.4} />
            </Pressable>
            <Text style={styles.topTitle}>Profile</Text>
            <View style={styles.backBtnGhost} />
          </View>

          <View style={styles.identityInner}>
            <View style={styles.avatarOuter}>
              {user?.profilePhotoUrl ? (
                <Image
                  source={{ uri: user.profilePhotoUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials || 'T'}</Text>
                </View>
              )}
            </View>

            <Text style={styles.name}>{displayName}</Text>
            {phone || email ? (
              <Text style={styles.contact} numberOfLines={1}>
                {[phone, email].filter(Boolean).join('  ·  ')}
              </Text>
            ) : null}

            <Pressable
              style={styles.editLink}
              onPress={() => router.push('/profile/edit')}
            >
              <Text style={styles.editLinkText}>Edit profile</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Money strip */}
          <Animated.View
            entering={FadeInDown.duration(380).springify()}
            style={styles.moneyStrip}
          >
            <Pressable
              style={styles.moneyCell}
              onPress={() => router.push('/profile/wallet')}
            >
              <Text style={styles.moneyLabel}>Wallet</Text>
              <Text style={styles.moneyValue}>₹{balance.toFixed(0)}</Text>
            </Pressable>
            <View style={styles.moneyDivider} />
            <Pressable
              style={styles.moneyCell}
              onPress={() => router.push('/profile/referral')}
            >
              <Text style={styles.moneyLabel}>Rewards</Text>
              <Text style={styles.moneyValue}>{points} pts</Text>
            </Pressable>
            <View style={styles.moneyDivider} />
            <Pressable
              style={styles.moneyCell}
              onPress={() =>
                router.push('/orders' as import('expo-router').Href)
              }
            >
              <Text style={styles.moneyLabel}>Orders</Text>
              <Text style={styles.moneyValue}>{orderCount}</Text>
            </Pressable>
          </Animated.View>

          {/* Address */}
          <Pressable
            style={styles.addressRow}
            onPress={() =>
              router.push('/profile/addresses' as import('expo-router').Href)
            }
          >
            <View style={styles.addressIcon}>
              <MapPin color={ORANGE} size={16} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>
                Delivering to · {addressLabel}
              </Text>
              <Text style={styles.addressValue} numberOfLines={2}>
                {hasAddress ? addressLine : 'Add a delivery address'}
              </Text>
            </View>
            <ChevronRight color={FAINT} size={18} strokeWidth={2.2} />
          </Pressable>

          {/* Menu groups — one sheet each, quiet dividers */}
          <MenuGroup title="Activity">
            <Row
              icon={Receipt}
              title="Your orders"
              trailing={String(orderCount)}
              onPress={() =>
                router.push('/orders' as import('expo-router').Href)
              }
            />
            <Row
              icon={Ticket}
              title="Vouchers & deals"
              onPress={() => router.push('/deals')}
            />
            <Row
              icon={Gift}
              title="Refer & earn"
              onPress={() => router.push('/profile/referral')}
              last
            />
          </MenuGroup>

          <MenuGroup title="Account">
            <Row
              icon={Phone}
              title="Phone & email"
              onPress={() => router.push('/profile/contact')}
            />
            <Row
              icon={Settings2}
              title="Preferences"
              onPress={() => router.push('/profile/preferences')}
            />
            <Row
              icon={Wallet}
              title="Tokajo wallet"
              trailing={`₹${balance.toFixed(0)}`}
              onPress={() => router.push('/profile/wallet')}
            />
            <Row
              icon={MonitorSmartphone}
              title="Active sessions"
              onPress={() => router.push('/profile/sessions')}
            />
            <Row
              icon={Smartphone}
              title="Devices"
              onPress={() => router.push('/profile/devices')}
              last
            />
          </MenuGroup>

          <MenuGroup title="Help">
            <Row
              icon={Headset}
              title="Help & support"
              onPress={() => router.push('/support')}
              last
            />
          </MenuGroup>

          <Pressable
            style={styles.logout}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator color={ORANGE} />
            ) : (
              <>
                <LogOut color={ORANGE} size={17} strokeWidth={2.3} />
                <Text style={styles.logoutText}>Log out</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.delete}
            onPress={() => router.push('/profile/delete-account')}
          >
            <Trash2 color="#B91C1C" size={14} strokeWidth={2.2} />
            <Text style={styles.deleteText}>Delete account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function MenuGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupSheet}>{children}</View>
    </View>
  );
}

function Row({
  icon: Icon,
  title,
  trailing,
  onPress,
  last,
}: {
  icon: IconType;
  title: string;
  trailing?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>
        <Icon color={INK} size={18} strokeWidth={1.9} />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
      {trailing ? <Text style={styles.rowTrailing}>{trailing}</Text> : null}
      <ChevronRight color={FAINT} size={18} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE,
  },
  identity: {
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnGhost: {
    width: 40,
    height: 40,
  },
  topTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: INK,
  },
  identityInner: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    backgroundColor: WHITE,
    marginBottom: 14,
    shadowColor: '#C2410C',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 41,
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 41,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: WHITE,
    letterSpacing: 0.5,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: INK,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  contact: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },
  editLink: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editLinkText: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: ORANGE,
  },
  body: {
    paddingHorizontal: 16,
    marginTop: -8,
  },
  moneyStrip: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  moneyCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  moneyDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: LINE,
    marginVertical: 4,
  },
  moneyLabel: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: FAINT,
    letterSpacing: 0.3,
  },
  moneyValue: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 22,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF1EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: FAINT,
    marginBottom: 2,
  },
  addressValue: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: INK,
  },
  group: {
    marginBottom: 20,
  },
  groupTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: FAINT,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  groupSheet: {
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 15,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    flex: 1,
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: INK,
  },
  rowTrailing: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: ORANGE,
  },
  logout: {
    marginTop: 4,
    height: 52,
    borderRadius: 14,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: ORANGE,
  },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 18,
  },
  deleteText: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: '#B91C1C',
  },
});
