import { Pressable } from '@/components/common/Pressable';
import { fonts } from '@/constants/typography';
import { useJoinGroupCart, useSharedCart } from '@/lib/cart/hooks';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShoppingBag, Users } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG = '#F4F5F7';
const WHITE = '#FFFFFF';
const ORANGE = '#F97316';
const TEXT = '#0B1220';
const TEXT_SEC = '#64748B';
const BORDER = '#E5E7EB';

type Props = {
  shareToken: string;
};

export function SharedCartPreviewScreen({ shareToken }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const preview = useSharedCart(shareToken, Boolean(shareToken));
  const join = useJoinGroupCart();

  const cart = preview.data;
  const items = cart?.items ?? [];
  const subtotal = Number(cart?.subtotal ?? 0);
  const restaurantName = cart?.restaurantName || 'Group order';

  const handleJoin = async () => {
    try {
      await join.mutateAsync(shareToken);
      Alert.alert('Joined group order', 'You can now add items to this shared cart.', [
        { text: 'Open cart', onPress: () => router.replace('/cart') },
      ]);
    } catch (e) {
      Alert.alert('Could not join group', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 4 }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft color={TEXT} size={20} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Group Order</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Users color={ORANGE} size={18} strokeWidth={2.2} />
          </View>
          <Text style={styles.heroTitle}>Join shared cart</Text>
          <Text style={styles.heroSubtitle}>{restaurantName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items in this cart</Text>
          {preview.isLoading ? (
            <Text style={styles.metaText}>Loading shared cart...</Text>
          ) : items.length === 0 ? (
            <Text style={styles.metaText}>No items yet. Join and start adding.</Text>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <ShoppingBag color={TEXT_SEC} size={14} strokeWidth={2} />
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{Math.round(subtotal)}</Text>
          </View>
        </View>

        <Pressable
          onPress={handleJoin}
          style={[styles.joinBtn, join.isPending && { opacity: 0.7 }]}
          disabled={join.isPending || !shareToken}
        >
          <Text style={styles.joinBtnText}>{join.isPending ? 'Joining...' : 'Join group cart'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: TEXT },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  heroCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 6,
  },
  heroIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontFamily: fonts.uiBold, fontSize: 16, color: TEXT },
  heroSubtitle: { fontFamily: fonts.ui, fontSize: 13, color: TEXT_SEC },
  section: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontFamily: fonts.uiBold, fontSize: 14, color: TEXT },
  metaText: { fontFamily: fonts.ui, color: TEXT_SEC, fontSize: 13 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, fontFamily: fonts.uiSemi, fontSize: 13, color: TEXT },
  itemQty: { fontFamily: fonts.uiBold, fontSize: 12, color: TEXT_SEC },
  totalRow: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: { fontFamily: fonts.uiSemi, fontSize: 13, color: TEXT_SEC },
  totalValue: { fontFamily: fonts.uiBold, fontSize: 14, color: TEXT },
  joinBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: { fontFamily: fonts.uiBold, fontSize: 15, color: WHITE },
});
