import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Receipt } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SmoothPressable } from '@/components/common/SmoothPressable';
import { fonts } from '@/constants/typography';
import {
  useCart,
  useCartBill,
  useCartSlots,
  useSetCartSchedule,
} from '@/lib/cart/hooks';
import { useDeliveryLocationStore } from '@/store/delivery-location-store';

const BG = '#F4F5F7';
const WHITE = '#FFFFFF';
const ORANGE = '#F97316';
const TEXT = '#0B1220';
const TEXT_SEC = '#64748B';
const BORDER = '#E5E7EB';

export function OrderSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const location = useDeliveryLocationStore((s) => s.location);
  const cart = useCart();
  const bill = useCartBill(location?.lat, location?.lng, Boolean(cart.data?.items?.length));
  const slots = useCartSlots(undefined, true);
  const setSchedule = useSetCartSchedule();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const billData = bill.data ?? ({} as Record<string, unknown>);
  const cartData = cart.data;

  const handleSchedule = (startTime: string) => {
    const next = selectedSlot === startTime ? null : startTime;
    setSelectedSlot(next);
    setSchedule.mutate(next);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <SmoothPressable onPress={() => router.back()} style={styles.iconBtn} pressScale={0.9}>
          <ArrowLeft color={TEXT} size={22} strokeWidth={2.2} />
        </SmoothPressable>
        <Text style={styles.headerTitle}>Order Summary</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* Bill breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Receipt color={ORANGE} size={18} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Bill Details</Text>
          </View>

          {bill.isLoading ? (
            <ActivityIndicator color={ORANGE} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.billRows}>
              <BillRow label="Item total" value={num(billData.subtotal ?? billData.itemTotal ?? cartData?.subtotal)} />
              <BillRow label="Delivery fee" value={num(billData.deliveryFee ?? billData.deliveryCharge ?? cartData?.deliveryFee)} />
              <BillRow label="Taxes & charges" value={num(billData.tax ?? billData.taxes ?? billData.gst ?? cartData?.tax)} />
              {num(billData.surge ?? billData.surgeFee) > 0 && (
                <BillRow label="Surge fee" value={num(billData.surge ?? billData.surgeFee)} />
              )}
              {num(billData.rainCharge ?? billData.rainFee) > 0 && (
                <BillRow label="Rain charge" value={num(billData.rainCharge ?? billData.rainFee)} />
              )}
              {num(billData.discount ?? billData.couponDiscount ?? cartData?.discount) > 0 && (
                <BillRow label="Discount" value={-num(billData.discount ?? billData.couponDiscount ?? cartData?.discount)} green />
              )}
              {num(billData.walletDeduction ?? billData.walletApplied) > 0 && (
                <BillRow label="Wallet" value={-num(billData.walletDeduction ?? billData.walletApplied)} green />
              )}
              {num(billData.loyaltyDeduction ?? billData.loyaltyDiscount) > 0 && (
                <BillRow label="Loyalty points" value={-num(billData.loyaltyDeduction ?? billData.loyaltyDiscount)} green />
              )}
              <View style={styles.billDivider} />
              <View style={styles.billRow}>
                <Text style={styles.billTotalLabel}>To Pay</Text>
                <Text style={styles.billTotalValue}>
                  ₹{num(billData.total ?? billData.grandTotal ?? billData.payableAmount ?? cartData?.total).toFixed(0)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Schedule delivery */}
        {(slots.data?.length ?? 0) > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Clock color={ORANGE} size={18} strokeWidth={2.2} />
              <Text style={styles.cardTitle}>Schedule for later</Text>
            </View>
            <View style={styles.slotsWrap}>
              {slots.data!.flatMap((day) =>
                day.slots.map((slot) => {
                  const key = `${day.date}_${slot.startTime}`;
                  const active = selectedSlot === slot.startTime;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.slotChip, active && styles.slotChipActive]}
                      onPress={() => handleSchedule(slot.startTime)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.slotText, active && styles.slotTextActive]}>
                        {slot.startTime}–{slot.endTime}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
            {selectedSlot && (
              <Text style={styles.scheduledHint}>
                Scheduled for {selectedSlot}
              </Text>
            )}
          </View>
        )}

        {/* Items summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {cartData?.itemCount ?? cartData?.items?.length ?? 0} items from {cartData?.restaurantName ?? 'Restaurant'}
          </Text>
          {cartData?.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemQty}>×{item.quantity}</Text>
              <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function BillRow({ label, value, green }: { label: string; value: number; green?: boolean }) {
  if (value === 0) return null;
  return (
    <View style={styles.billRow}>
      <Text style={styles.billLabel}>{label}</Text>
      <Text style={[styles.billValue, green && { color: '#16A34A' }]}>
        {value < 0 ? `-₹${Math.abs(value).toFixed(0)}` : `₹${value.toFixed(0)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.displayBold, fontSize: 17, color: TEXT },
  card: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: BORDER },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 14, color: TEXT },
  billRows: { gap: 6 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billLabel: { fontFamily: fonts.ui, fontSize: 13, color: TEXT_SEC },
  billValue: { fontFamily: fonts.uiSemi, fontSize: 13, color: TEXT },
  billDivider: { height: 1, backgroundColor: BORDER, marginVertical: 8 },
  billTotalLabel: { fontFamily: fonts.displayBold, fontSize: 15, color: TEXT },
  billTotalValue: { fontFamily: fonts.displayBold, fontSize: 15, color: TEXT },
  slotsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FAFAFA' },
  slotChipActive: { borderColor: ORANGE, backgroundColor: '#FFF7ED' },
  slotText: { fontFamily: fonts.uiSemi, fontSize: 12, color: TEXT_SEC },
  slotTextActive: { color: ORANGE },
  scheduledHint: { fontFamily: fonts.ui, fontSize: 12, color: ORANGE, marginTop: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  itemName: { flex: 1, fontFamily: fonts.ui, fontSize: 13, color: TEXT },
  itemQty: { fontFamily: fonts.uiSemi, fontSize: 13, color: TEXT_SEC },
  itemPrice: { fontFamily: fonts.uiSemi, fontSize: 13, color: TEXT },
});
