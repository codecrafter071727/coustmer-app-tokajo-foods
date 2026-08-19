/**
 * CouponPickerSheet — Swiggy/Zomato-style coupon browser
 *
 * GET /coupons               → discover available coupons
 * GET /coupons/:code/preview → preview discount amount before applying
 * POST /cart/coupon          → apply selected code
 */
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { CheckCircle2, Tag, X } from 'lucide-react-native';
import { useState } from 'react';

import { fonts } from '@/constants/typography';
import {
  useApplyCoupon,
  useCouponPreview,
  useDiscoverCoupons,
} from '@/lib/cart/hooks';

const ORANGE = '#F97316';
const TEXT = '#0B1220';
const TEXT_SEC = '#64748B';
const TEXT_MUTED = '#94A3B8';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';
const BG = '#F4F5F7';
const GREEN = '#16A34A';

type RawCoupon = Record<string, unknown>;

function mapCouponRow(raw: RawCoupon) {
  return {
    code: String(raw.code ?? raw.couponCode ?? ''),
    title: String(raw.title ?? raw.name ?? raw.description ?? ''),
    description: String(raw.description ?? raw.subtitle ?? raw.termsText ?? ''),
    discount: Number(raw.discount ?? raw.discountAmount ?? raw.value ?? 0),
    discountType: String(raw.discountType ?? raw.type ?? 'flat'),
    minOrder: Number(raw.minOrder ?? raw.minimumOrder ?? raw.minCartValue ?? 0),
    maxDiscount: Number(raw.maxDiscount ?? raw.maxAmount ?? raw.cap ?? 0),
    expiresAt: raw.expiresAt ?? raw.validUntil ?? raw.expiry,
  };
}

function PreviewBadge({ code }: { code: string }) {
  const preview = useCouponPreview(code, code.length >= 2);
  const data = preview.data as Record<string, unknown> | undefined;
  const discount = Number(data?.discount ?? data?.discountAmount ?? data?.savings ?? 0);

  if (preview.isLoading) return <ActivityIndicator color={ORANGE} size="small" />;
  if (!discount) return null;

  return (
    <View style={styles.previewBadge}>
      <Text style={styles.previewText}>Save ₹{discount.toFixed(0)}</Text>
    </View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onApplied?: (code: string, discount: number) => void;
};

export function CouponPickerSheet({ visible, onClose, onApplied }: Props) {
  const [manualCode, setManualCode] = useState('');
  const [applying, setApplying] = useState<string | null>(null);

  const { data: rawCoupons, isLoading } = useDiscoverCoupons(visible);
  const applyCoupon = useApplyCoupon();

  const coupons = (rawCoupons ?? []).map(mapCouponRow).filter((c) => c.code);

  const handleApply = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setApplying(trimmed);
    try {
      const cart = await applyCoupon.mutateAsync({ code: trimmed });
      const discount = cart.discount ?? 0;
      Alert.alert(
        'Promo applied! 🎉',
        discount > 0 ? `₹${Math.round(discount)} saved with ${trimmed}` : `${trimmed} applied to your cart`,
        [{ text: 'Great', onPress: onClose }]
      );
      onApplied?.(trimmed, discount);
      setManualCode('');
    } catch (e) {
      Alert.alert('Could not apply', e instanceof Error ? e.message : 'Invalid or expired code');
    } finally {
      setApplying(null);
    }
  };

  const renderCoupon = ({ item }: { item: ReturnType<typeof mapCouponRow> }) => {
    const isBusy = applying === item.code;
    const discountLabel =
      item.discountType === 'percent'
        ? `${item.discount}% off${item.maxDiscount > 0 ? ` up to ₹${item.maxDiscount}` : ''}`
        : item.discount > 0
        ? `₹${item.discount} off`
        : '';

    return (
      <View style={styles.couponCard}>
        {/* Code badge */}
        <View style={styles.codeRow}>
          <View style={styles.codeBadge}>
            <Tag color={ORANGE} size={13} strokeWidth={2.3} />
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
          {discountLabel ? (
            <Text style={styles.discountLabel}>{discountLabel}</Text>
          ) : null}
          <PreviewBadge code={item.code} />
        </View>

        {/* Title / description */}
        {item.title ? (
          <Text style={styles.couponTitle} numberOfLines={1}>{item.title}</Text>
        ) : null}
        {item.description && item.description !== item.title ? (
          <Text style={styles.couponDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        {item.minOrder > 0 ? (
          <Text style={styles.couponMeta}>Min order ₹{item.minOrder}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.applyBtn, isBusy && { opacity: 0.6 }]}
          onPress={() => handleApply(item.code)}
          disabled={isBusy || applying !== null}
          activeOpacity={0.8}
        >
          {isBusy ? (
            <ActivityIndicator color={ORANGE} size="small" />
          ) : (
            <Text style={styles.applyBtnText}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.dragPill} />
          </View>
          <View style={styles.titleRow}>
            <Tag color={ORANGE} size={20} strokeWidth={2.2} />
            <Text style={styles.sheetTitle}>Offers & Coupons</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={TEXT_SEC} size={20} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Manual entry */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter coupon code"
              placeholderTextColor={TEXT_MUTED}
              value={manualCode}
              onChangeText={(t) => setManualCode(t.toUpperCase())}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={() => handleApply(manualCode)}
            />
            <TouchableOpacity
              style={[styles.checkBtn, !manualCode.trim() && { opacity: 0.5 }]}
              onPress={() => handleApply(manualCode)}
              disabled={!manualCode.trim() || applying !== null}
              activeOpacity={0.8}
            >
              {applying === manualCode.trim().toUpperCase() ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <CheckCircle2 color={WHITE} size={20} strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <Text style={styles.sectionLabel}>Available offers</Text>

          {isLoading ? (
            <ActivityIndicator color={ORANGE} style={{ marginVertical: 20 }} />
          ) : !coupons.length ? (
            <Text style={styles.emptyText}>No offers available for your cart right now</Text>
          ) : (
            <FlatList
              data={coupons}
              keyExtractor={(c) => c.code}
              renderItem={renderCoupon}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '85%' },
  headerRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  dragPill: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  sheetTitle: { flex: 1, fontFamily: fonts.displayBold, fontSize: 17, color: TEXT },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  codeInput: { flex: 1, backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.uiSemi, fontSize: 14, color: TEXT, borderWidth: 1, borderColor: BORDER, letterSpacing: 1 },
  checkBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontFamily: fonts.displayBold, fontSize: 14, color: TEXT, marginBottom: 10 },
  emptyText: { fontFamily: fonts.ui, fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginVertical: 20 },
  couponCard: { backgroundColor: BG, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#FED7AA', borderStyle: 'dashed' },
  codeText: { fontFamily: fonts.uiBold, fontSize: 13, color: ORANGE, letterSpacing: 0.8 },
  discountLabel: { fontFamily: fonts.uiSemi, fontSize: 12, color: GREEN, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  previewBadge: { backgroundColor: '#FEF9C3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  previewText: { fontFamily: fonts.uiSemi, fontSize: 12, color: '#A16207' },
  couponTitle: { fontFamily: fonts.uiSemi, fontSize: 14, color: TEXT, marginBottom: 2 },
  couponDesc: { fontFamily: fonts.ui, fontSize: 12, color: TEXT_SEC, marginBottom: 4 },
  couponMeta: { fontFamily: fonts.ui, fontSize: 11, color: TEXT_MUTED, marginBottom: 8 },
  applyBtn: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: ORANGE },
  applyBtnText: { fontFamily: fonts.uiBold, fontSize: 13, color: ORANGE },
});
