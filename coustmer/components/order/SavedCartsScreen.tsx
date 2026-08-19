import { useRouter } from 'expo-router';
import { ArrowLeft, Bookmark, RotateCcw, Trash2 } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SmoothPressable } from '@/components/common/SmoothPressable';
import { fonts } from '@/constants/typography';
import {
  useDeleteSavedCart,
  useRestoreSavedCart,
  useSavedCarts,
} from '@/lib/cart/hooks';
import type { SavedCart } from '@/lib/cart/types';

const BG = '#F4F5F7';
const WHITE = '#FFFFFF';
const ORANGE = '#F97316';
const TEXT = '#0B1220';
const TEXT_SEC = '#64748B';
const TEXT_MUTED = '#94A3B8';
const BORDER = '#E5E7EB';

export function SavedCartsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: carts, isLoading } = useSavedCarts();
  const restoreMut = useRestoreSavedCart();
  const deleteMut = useDeleteSavedCart();

  const handleRestore = (id: string) => {
    Alert.alert('Restore cart?', 'This will replace your current cart.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: () =>
          restoreMut.mutate(id, {
            onSuccess: () => router.replace('/cart'),
            onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
          }),
      },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete saved cart?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(id) },
    ]);
  };

  const renderItem = ({ item }: { item: SavedCart }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{item.name || item.restaurantName || 'Saved Cart'}</Text>
        <Text style={styles.cardMeta}>
          {item.itemCount ?? item.items?.length ?? 0} items
          {item.subtotal ? ` · ₹${item.subtotal.toFixed(0)}` : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleRestore(item.id)} style={styles.actionBtn}>
        <RotateCcw color={ORANGE} size={18} strokeWidth={2.2} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
        <Trash2 color="#EF4444" size={18} strokeWidth={2.2} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <SmoothPressable onPress={() => router.back()} style={styles.iconBtn} pressScale={0.9}>
          <ArrowLeft color={TEXT} size={22} strokeWidth={2.2} />
        </SmoothPressable>
        <Text style={styles.headerTitle}>Saved Carts</Text>
        <View style={styles.iconBtn} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} size="large" />
      ) : !carts?.length ? (
        <View style={styles.emptyWrap}>
          <Bookmark color={TEXT_MUTED} size={60} strokeWidth={1.2} />
          <Text style={styles.emptyTitle}>No saved carts</Text>
          <Text style={styles.emptySub}>Save a cart from the cart screen to reorder later</Text>
        </View>
      ) : (
        <FlatList
          data={carts}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.displayBold, fontSize: 17, color: TEXT },
  card: { backgroundColor: WHITE, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  cardName: { fontFamily: fonts.displayBold, fontSize: 14, color: TEXT },
  cardMeta: { fontFamily: fonts.ui, fontSize: 12, color: TEXT_SEC, marginTop: 2 },
  actionBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: TEXT },
  emptySub: { fontFamily: fonts.ui, fontSize: 14, color: TEXT_SEC, textAlign: 'center', paddingHorizontal: 40 },
});
