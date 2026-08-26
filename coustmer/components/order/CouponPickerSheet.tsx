/**
 * CouponPickerSheet — Swiggy/Zomato-style coupon browser
 *
 * GET /coupons?restaurantId=&lat=&lng=  → platform admin coupons + restaurant store offers
 * GET /coupons/:code/preview             → preview discount before applying
 * POST /cart/coupon                      → apply selected code
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
import { CheckCircle2, Store, Tag, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';

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

export type CouponRow = {
  code: string;
  title: string;
  description: string;
  discount: number;
  discountType: string;
  minOrder: number;
  maxDiscount: number;
  expiresAt: unknown;
  scope: 'platform' | 'restaurant';
  autoApply: boolean;
};

function mapCouponRow(raw: RawCoupon): CouponRow {
  const type = String(raw.type ?? raw.discountType ?? 'flat');
  return {
    code: String(raw.code ?? raw.couponCode ?? ''),
    title: String(raw.title ?? raw.name ?? ''),
    description: String(raw.description ?? raw.subtitle ?? raw.termsText ?? ''),
    discount: Number(raw.value ?? raw.discount ?? raw.discountAmount ?? 0),
    discountType: type === 'percentage' ? 'percent' : type,
    minOrder: Number(raw.minOrderValue ?? raw.minOrder ?? raw.minimumOrder ?? raw.minCartValue ?? 0),
    maxDiscount: Number(raw.maxDiscount ?? raw.maxAmount ?? raw.cap ?? 0),
    expiresAt: raw.endsAt ?? raw.expiresAt ?? raw.validUntil ?? raw.expiry,
    scope: raw.scope === 'restaurant' ? 'restaurant' : 'platform',
    autoApply: raw.autoApply === true,
  };
}

function PreviewBadge({
  code,
  restaurantId,
  subtotal,
  discountType,
}: {
  code: string;
  restaurantId?: string;
  subtotal?: number;
  discountType?: string;
}) {
  const preview = useCouponPreview(code, code.length >= 2, { restaurantId, subtotal });
  const data = preview.data as Record<string, unknown> | undefined;
  const discount = Number(data?.discount ?? data?.discountAmount ?? data?.savings ?? 0);
  const previewType = String(data?.type ?? discountType ?? '');

  if (preview.isLoading) return <ActivityIndicator color={ORANGE} size="small" />;
  if (previewType === 'free_delivery' || discountType === 'free_delivery') {
    return (
      <View style={styles.previewBadge}>
        <Text style={styles.previewText}>Free delivery</Text>
      </View>
    );
  }
  if (!discount) return null;

  return (
    <View style={styles.previewBadge}>
      <Text style={styles.previewText}>Save ₹{discount.toFixed(0)}</Text>
    </View>
  );
}

function CouponCard({
  item,
  applying,
  onApply,
  restaurantId,
  subtotal,
}: {
  item: CouponRow;
  applying: string | null;
  onApply: (code: string) => void;
  restaurantId?: string;
  subtotal?: number;
}) {
  const isBusy = applying === item.code;
  const cartTotal = Number(subtotal ?? 0);
  const shortfall = Math.max(0, Math.ceil((item.minOrder || 0) - cartTotal));
  const eligible = shortfall <= 0;
  const isAutoFreeDelivery =
    item.autoApply && (item.discountType === 'free_delivery' || item.discountType === 'free delivery');
  const discountLabel =
    item.discountType === 'percent' || item.discountType === 'percentage'
      ? `${item.discount}% off${item.maxDiscount > 0 ? ` up to ₹${item.maxDiscount}` : ''}`
      : item.discountType === 'free_delivery'
      ? item.minOrder > 0
        ? `Free delivery on item total ₹${item.minOrder}+`
        : 'Free delivery'
      : item.discount > 0
      ? `₹${item.discount} off`
      : '';

  const effectLine =
    item.discountType === 'free_delivery'
      ? item.minOrder > 0
        ? `Free delivery when item total is ₹${item.minOrder}+`
        : 'Free delivery on this order'
      : item.discountType === 'percent' || item.discountType === 'percentage'
      ? `${item.discount}% off item total${item.minOrder > 0 ? ` (min ₹${item.minOrder})` : ''}`
      : item.discount > 0
      ? `₹${item.discount} off item total${item.minOrder > 0 ? ` (min ₹${item.minOrder})` : ''}`
      : item.description;

  return (
    <View style={[styles.couponCard, !eligible && !isAutoFreeDelivery && styles.couponCardLocked]}>
      <View style={styles.codeRow}>
        <View style={styles.codeBadge}>
          <Tag color={ORANGE} size={13} strokeWidth={2.3} />
          <Text style={styles.codeText}>{item.code}</Text>
        </View>
        {item.autoApply ? (
          <View style={styles.autoBadge}>
            <Text style={styles.autoBadgeText}>Auto-applied</Text>
          </View>
        ) : null}
        {item.scope === 'restaurant' ? (
          <View style={styles.scopeBadge}>
            <Store color={TEXT_SEC} size={11} strokeWidth={2.2} />
            <Text style={styles.scopeText}>Restaurant</Text>
          </View>
        ) : (
          <View style={styles.scopeBadge}>
            <Text style={styles.scopeText}>Platform</Text>
          </View>
        )}
        {discountLabel ? (
          <Text style={styles.discountLabel}>{discountLabel}</Text>
        ) : null}
        {eligible ? (
          <PreviewBadge
            code={item.code}
            restaurantId={restaurantId}
            subtotal={subtotal}
            discountType={item.discountType}
          />
        ) : null}
      </View>

      {item.title ? (
        <Text style={styles.couponTitle} numberOfLines={1}>{item.title}</Text>
      ) : null}
      {effectLine ? (
        <Text style={styles.couponDesc} numberOfLines={2}>{effectLine}</Text>
      ) : null}
      {item.minOrder > 0 && !isAutoFreeDelivery ? (
        <Text style={styles.couponMeta}>
          {eligible
            ? `Eligible on your item total of ₹${Math.round(cartTotal)}`
            : `Add ₹${shortfall} more to item total to unlock`}
        </Text>
      ) : null}

      {item.autoApply ? (
        <Text style={styles.autoHint}>
          Applied automatically at checkout when your item total meets the minimum.
        </Text>
      ) : eligible ? (
        <TouchableOpacity
          style={[styles.applyBtn, isBusy && { opacity: 0.6 }]}
          onPress={() => onApply(item.code)}
          disabled={isBusy || applying !== null}
          activeOpacity={0.8}
        >
          {isBusy ? (
            <ActivityIndicator color={ORANGE} size="small" />
          ) : (
            <Text style={styles.applyBtnText}>Apply</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.lockedBtn}>
          <Text style={styles.lockedBtnText}>Add ₹{shortfall} more</Text>
        </View>
      )}
    </View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onApplied?: (code: string, discount: number) => void;
  restaurantId?: string;
  lat?: number;
  lng?: number;
  subtotal?: number;
};

export function CouponPickerSheet({
  visible,
  onClose,
  onApplied,
  restaurantId,
  lat,
  lng,
  subtotal,
}: Props) {
  const [manualCode, setManualCode] = useState('');
  const [applying, setApplying] = useState<string | null>(null);

  const { data: rawCoupons, isLoading } = useDiscoverCoupons(visible, {
    restaurantId,
    lat,
    lng,
  });
  const applyCoupon = useApplyCoupon();

  const { restaurantOffers, platformOffers } = useMemo(() => {
    const all = (rawCoupons ?? []).map(mapCouponRow).filter((c) => c.code);
    const cartTotal = Number(subtotal ?? 0);
    const sortEligibleFirst = (a: CouponRow, b: CouponRow) => {
      const aOk = cartTotal >= (a.minOrder || 0) ? 0 : 1;
      const bOk = cartTotal >= (b.minOrder || 0) ? 0 : 1;
      if (aOk !== bOk) return aOk - bOk;
      return (a.minOrder || 0) - (b.minOrder || 0);
    };
    return {
      restaurantOffers: all.filter((c) => c.scope === 'restaurant').sort(sortEligibleFirst),
      platformOffers: all.filter((c) => c.scope === 'platform').sort(sortEligibleFirst),
    };
  }, [rawCoupons, subtotal]);

  const handleApply = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setApplying(trimmed);
    try {
      const cart = await applyCoupon.mutateAsync({ code: trimmed });
      const discount = cart.discount ?? 0;
      Alert.alert(
        'Promo applied!',
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

  const hasOffers = restaurantOffers.length > 0 || platformOffers.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
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

          {isLoading ? (
            <ActivityIndicator color={ORANGE} style={{ marginVertical: 20 }} />
          ) : !hasOffers ? (
            <Text style={styles.emptyText}>No offers available for your cart right now</Text>
          ) : (
            <FlatList
              data={[
                ...(restaurantOffers.length
                  ? [{ kind: 'header' as const, id: 'restaurant-header', label: 'Restaurant offers' }]
                  : []),
                ...restaurantOffers.map((c) => ({ kind: 'coupon' as const, id: `r-${c.code}`, coupon: c })),
                ...(platformOffers.length
                  ? [{ kind: 'header' as const, id: 'platform-header', label: 'Platform offers' }]
                  : []),
                ...platformOffers.map((c) => ({ kind: 'coupon' as const, id: `p-${c.code}`, coupon: c })),
              ]}
              keyExtractor={(row) => row.id}
              renderItem={({ item }) =>
                item.kind === 'header' ? (
                  <Text style={styles.sectionLabel}>{item.label}</Text>
                ) : (
                  <CouponCard
                    item={item.coupon}
                    applying={applying}
                    onApply={handleApply}
                    restaurantId={restaurantId}
                    subtotal={subtotal}
                  />
                )
              }
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
  sectionLabel: { fontFamily: fonts.displayBold, fontSize: 14, color: TEXT, marginTop: 4, marginBottom: 2 },
  emptyText: { fontFamily: fonts.ui, fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginVertical: 20 },
  couponCard: { backgroundColor: BG, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  couponCardLocked: { opacity: 0.85 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#FED7AA', borderStyle: 'dashed' },
  codeText: { fontFamily: fonts.uiBold, fontSize: 13, color: ORANGE, letterSpacing: 0.8 },
  scopeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  scopeText: { fontFamily: fonts.uiSemi, fontSize: 11, color: TEXT_SEC },
  discountLabel: { fontFamily: fonts.uiSemi, fontSize: 12, color: GREEN, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  autoBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  autoBadgeText: { fontFamily: fonts.uiSemi, fontSize: 11, color: '#2563EB' },
  autoHint: { fontFamily: fonts.ui, fontSize: 12, color: TEXT_SEC, marginTop: 4 },
  previewBadge: { backgroundColor: '#FEF9C3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  previewText: { fontFamily: fonts.uiSemi, fontSize: 12, color: '#A16207' },
  couponTitle: { fontFamily: fonts.uiSemi, fontSize: 14, color: TEXT, marginBottom: 2 },
  couponDesc: { fontFamily: fonts.ui, fontSize: 12, color: TEXT_SEC, marginBottom: 4 },
  couponMeta: { fontFamily: fonts.ui, fontSize: 11, color: TEXT_MUTED, marginBottom: 8 },
  applyBtn: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: ORANGE },
  applyBtnText: { fontFamily: fonts.uiBold, fontSize: 13, color: ORANGE },
  lockedBtn: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E2E8F0' },
  lockedBtnText: { fontFamily: fonts.uiSemi, fontSize: 12, color: TEXT_SEC },
});
