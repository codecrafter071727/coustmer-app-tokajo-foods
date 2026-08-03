import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  FileText,
  Headset,
  IndianRupee,
  MapPin,
  RotateCcw,
  Store,
  Star,
  Truck,
  XCircle,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingView, ErrorView } from '@/components/common/StateViews';
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline';
import { VegBadge } from '@/components/restaurant/MenuBadges';
import { fonts } from '@/constants/typography';
import {
  useCancelOrder,
  useCancelScheduledOrder,
  useFetchInvoice,
  useOrder,
  useReorder,
  useUpdateTip,
} from '@/lib/order/hooks';
import { paymentMethodLabel } from '@/lib/order/payment-labels';
import {
  canCancelOrder,
  canRateOrder,
  canTipOrder,
  isActiveOrderStatus,
  isScheduledOrder,
  normalizeOrderStatus,
} from '@/lib/order/types';
import { useOrderReview } from '@/lib/review/hooks';

const ORANGE = '#FF6A00';
const ORANGE_SOFT = '#FFF4EC';
const INK = '#111827';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';
const WHITE = '#FFFFFF';
const GREEN = '#059669';
const BG = '#F3F4F6';
const TAX_RATE = 0.05;

function formatWhen(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${date}, ${time}`;
}

function statusHeadline(status?: string) {
  const s = normalizeOrderStatus(status);
  if (['cancelled', 'canceled'].includes(s)) return 'Cancelled';
  if (['rejected', 'failed'].includes(s)) return 'Rejected';
  if (['delivered', 'completed'].includes(s)) return 'Completed';
  if (s.includes('out') || s.includes('way') || s.includes('pick')) {
    return 'Out for delivery';
  }
  if (s.includes('ready')) return 'Ready for pickup';
  if (s.includes('prepar')) return 'Preparing your food';
  if (s.includes('confirm') || s.includes('accept')) return 'Order confirmed';
  return 'Order placed';
}

export function OrderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = String(orderId ?? '');

  const order = useOrder(id);
  const reorder = useReorder(id);
  const cancelOrder = useCancelOrder(id);
  const cancelScheduled = useCancelScheduledOrder(id);
  const updateTip = useUpdateTip(id);
  const fetchInvoice = useFetchInvoice(id);
  const review = useOrderReview(id, {
    enabled: canRateOrder(order.data?.status),
  });

  const data = order.data;

  if (order.isLoading && !data) {
    return <LoadingView label="Loading details…" />;
  }

  if (order.isError && !data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ErrorView
          message={
            order.error instanceof Error
              ? order.error.message
              : 'Could not load order'
          }
          onRetry={() => void order.refetch()}
        />
      </View>
    );
  }

  if (!data) return null;

  const orderIdLabel = data.orderNumber || data.id.slice(-8).toUpperCase();
  const itemCount = data.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal =
    typeof data.subtotal === 'number'
      ? data.subtotal
      : data.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = Number(data.deliveryFee ?? 0);
  const tip = Number(data.tip ?? 0);
  const discount = Number(data.discount ?? 0);
  const couponCode =
    data.couponCode ||
    (typeof data.raw?.couponCode === 'string'
      ? data.raw.couponCode
      : undefined) ||
    (typeof data.raw?.promoCode === 'string' ? data.raw.promoCode : undefined);

  const tax = (() => {
    const fromApi = Number(data.tax ?? 0);
    if (fromApi > 0.009) return Math.round(fromApi * 100) / 100;
    if (typeof data.total === 'number' && data.total > 0) {
      const withoutTax = subtotal + deliveryFee + tip - discount;
      const implied = Math.round((data.total - withoutTax) * 100) / 100;
      if (implied > 0.009) return implied;
    }
    if (subtotal > 0) return Math.round(subtotal * TAX_RATE * 100) / 100;
    return 0;
  })();

  const total = (() => {
    if (typeof data.total === 'number' && data.total > 0) {
      const withoutTax = subtotal + deliveryFee + tip - discount;
      if (tax > 0 && Math.abs(data.total - withoutTax) < 0.02) {
        return Math.round((withoutTax + tax) * 100) / 100;
      }
      return data.total;
    }
    return Math.max(
      0,
      Math.round((subtotal + deliveryFee + tax + tip - discount) * 100) / 100
    );
  })();

  const taxIsFivePercent =
    tax > 0 &&
    Math.abs(tax - Math.round(subtotal * TAX_RATE * 100) / 100) < 0.05;

  const isActive = isActiveOrderStatus(data.status);
  const completed = canRateOrder(data.status);
  const cancelled = ['cancelled', 'canceled', 'rejected', 'failed'].includes(
    normalizeOrderStatus(data.status)
  );
  const hasReviewed = review.data !== null && review.data !== undefined;
  const scheduled = isScheduledOrder(data);
  const showCancel = canCancelOrder(data.status) || scheduled;
  const showTip = canTipOrder(data.status);
  const showInvoice = completed || cancelled || !isActive;

  const address =
    data.deliveryAddress?.formattedAddress ||
    [
      data.deliveryAddress?.street,
      data.deliveryAddress?.area,
      data.deliveryAddress?.city,
    ]
      .filter(Boolean)
      .join(', ') ||
    'Delivery address';

  const handleCancel = () => {
    Alert.alert(
      scheduled ? 'Cancel scheduled order?' : 'Cancel this order?',
      scheduled
        ? 'This removes the future order.'
        : 'You can cancel only within the allowed window.',
      [
        { text: 'Keep order', style: 'cancel' },
        {
          text: 'Cancel order',
          style: 'destructive',
          onPress: async () => {
            try {
              if (scheduled) {
                await cancelScheduled.mutateAsync();
              } else {
                await cancelOrder.mutateAsync({ reason: 'Cancelled by customer' });
              }
              Alert.alert('Cancelled', 'Your order was cancelled.');
              void order.refetch();
            } catch (e) {
              Alert.alert(
                'Could not cancel',
                e instanceof Error ? e.message : 'Please try again'
              );
            }
          },
        },
      ]
    );
  };

  const handleInvoice = async () => {
    try {
      const invoice = await fetchInvoice.mutateAsync();
      if (invoice.url) {
        await Linking.openURL(invoice.url);
        return;
      }
      Alert.alert(
        'Invoice',
        invoice.message || 'Invoice link is not available yet.'
      );
    } catch (e) {
      Alert.alert(
        'Invoice unavailable',
        e instanceof Error ? e.message : 'Could not fetch invoice'
      );
    }
  };

  const handleTip = (amount: number) => {
    updateTip.mutate(
      { tip: amount },
      {
        onSuccess: () => {
          void order.refetch();
          Alert.alert('Tip updated', `Delivery tip set to ₹${amount}`);
        },
        onError: (e) =>
          Alert.alert(
            'Could not update tip',
            e instanceof Error ? e.message : 'Please try again'
          ),
      }
    );
  };

  const handleReorder = () => {
    Alert.alert('Order again?', 'Add the same items to your cart.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Order again',
        onPress: async () => {
          try {
            const next = await reorder.mutateAsync();
            if (next.mode === 'order' && next.order?.id) {
              router.replace({
                pathname: '/orders/[orderId]/tracking',
                params: { orderId: next.order.id, newOrder: 'true' },
              });
              return;
            }
            Alert.alert(
              'Added to cart',
              next.message || 'Review your cart to place the order.',
              [
                {
                  text: 'Go to cart',
                  onPress: () =>
                    router.push('/cart' as import('expo-router').Href),
                },
              ]
            );
          } catch (e) {
            Alert.alert(
              'Reorder failed',
              e instanceof Error ? e.message : 'Could not reorder'
            );
          }
        },
      },
    ]);
  };

  const openTracking = () => {
    router.push({
      pathname: '/orders/[orderId]/tracking',
      params: { orderId: data.id },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF7ED', BG]}
        style={[styles.headerGrad, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/orders')
            }
            style={styles.circleBtn}
            hitSlop={8}
          >
            <ArrowLeft color={INK} size={20} strokeWidth={2.4} />
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {data.restaurantName || 'Order details'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              #{orderIdLabel}
              {itemCount ? ` · ${itemCount} items` : ''}
            </Text>
          </View>
          <Pressable
            style={styles.helpBtn}
            onPress={() =>
              router.push({
                pathname: '/orders/[orderId]/issues',
                params: { orderId: data.id },
              })
            }
          >
            <Headset color={ORANGE} size={16} strokeWidth={2.4} />
            <Text style={styles.helpBtnText}>Help</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View
              style={[
                styles.statusChip,
                completed && styles.statusChipDone,
                cancelled && styles.statusChipCancel,
                isActive && styles.statusChipLive,
              ]}
            >
              {isActive ? <View style={styles.liveDot} /> : null}
              {completed ? (
                <Check color={GREEN} size={12} strokeWidth={3} />
              ) : null}
              <Text
                style={[
                  styles.statusChipText,
                  completed && { color: GREEN },
                  cancelled && { color: '#DC2626' },
                  isActive && { color: ORANGE },
                ]}
              >
                {statusHeadline(data.status)}
              </Text>
            </View>
            <Text style={styles.heroWhen}>{formatWhen(data.createdAt)}</Text>
          </View>
          <Text style={styles.heroTitle}>{statusHeadline(data.status)}</Text>
          <Text style={styles.heroSub}>
            {isActive
              ? 'Track live progress or review your bill below'
              : completed
                ? 'Hope you enjoyed your meal'
                : 'Order details and bill summary'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.block}>
          <OrderStatusTimeline
            currentStatus={data.status}
            timestamps={{
              pending: data.createdAt,
              createdAt: data.createdAt,
              accepted: data.acceptedAt,
              preparing: data.preparingAt,
              ready: data.readyAt,
              'out-for-delivery': data.outForDeliveryAt,
              outForDeliveryAt: data.outForDeliveryAt,
              delivered: data.deliveredAt,
              cancelled: data.cancelledAt,
              rejected: data.rejectedAt,
            }}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>DELIVERING TO</Text>
          <View style={styles.routeRow}>
            <View style={styles.routeIcons}>
              <View style={styles.routeDotRest}>
                <Store color={ORANGE} size={14} strokeWidth={2.4} />
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeDotHome}>
                <MapPin color={INK} size={14} strokeWidth={2.4} />
              </View>
            </View>
            <View style={{ flex: 1, gap: 16 }}>
              <View>
                <Text style={styles.routeLabel}>Restaurant</Text>
                <Text style={styles.routeTitle} numberOfLines={1}>
                  {data.restaurantName || 'Restaurant'}
                </Text>
              </View>
              <View>
                <Text style={styles.routeLabel}>
                  {data.deliveryAddress?.label || 'Home'}
                </Text>
                <Text style={styles.routeBody}>{address}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>ITEMS</Text>
          {data.items.map((item, idx) => (
            <View key={`${item.id ?? item.name}-${idx}`}>
              {idx > 0 ? <View style={styles.hairline} /> : null}
              <View style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <VegBadge isVeg={item.isVeg ?? true} />
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.itemThumb}
                      contentFit="cover"
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
                  </View>
                </View>
                <Text style={styles.itemPrice}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>BILL DETAILS</Text>
          <BillLine label={`Item total (${itemCount})`} value={subtotal} />
          <BillLine
            label="Delivery fee"
            value={deliveryFee}
            free={deliveryFee <= 0}
          />
          {discount > 0 ? (
            <BillLine
              label={
                couponCode
                  ? `Promo · ${String(couponCode).toUpperCase()}`
                  : 'Promo discount'
              }
              value={-discount}
              green
            />
          ) : null}
          <BillLine
            label={
              taxIsFivePercent ? 'Taxes & charges (5%)' : 'Taxes & charges'
            }
            value={tax}
          />
          {tip > 0 ? <BillLine label="Partner tip" value={tip} /> : null}
          <View style={styles.totalRule} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand total</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
          {data.paymentMethod ? (
            <Text style={styles.payNote}>
              {paymentMethodLabel(data.paymentMethod)}
            </Text>
          ) : null}
        </View>

        {!isActive ? (
          <Pressable
            style={styles.refundLink}
            onPress={() =>
              router.push({
                pathname: '/orders/[orderId]/refunds',
                params: { orderId: data.id },
              })
            }
          >
            <RotateCcw color={ORANGE} size={16} strokeWidth={2.4} />
            <View style={{ flex: 1 }}>
              <Text style={styles.refundLinkTitle}>Refunds</Text>
              <Text style={styles.refundLinkSub}>
                Request a refund or check status
              </Text>
            </View>
          </Pressable>
        ) : null}

        {showTip ? (
          <View style={styles.tipCard}>
            <View style={styles.tipHead}>
              <IndianRupee color={ORANGE} size={16} strokeWidth={2.4} />
              <Text style={styles.tipTitle}>Add delivery tip</Text>
            </View>
            <Text style={styles.tipSub}>
              Current tip ₹{tip.toFixed(0)}. Change before the restaurant accepts.
            </Text>
            <View style={styles.tipRow}>
              {[0, 20, 30, 50].map((amount) => (
                <Pressable
                  key={amount}
                  style={[
                    styles.tipChip,
                    tip === amount && styles.tipChipOn,
                    updateTip.isPending && styles.tipChipDisabled,
                  ]}
                  disabled={updateTip.isPending}
                  onPress={() => handleTip(amount)}
                >
                  <Text
                    style={[
                      styles.tipChipText,
                      tip === amount && styles.tipChipTextOn,
                    ]}
                  >
                    {amount === 0 ? 'No tip' : `₹${amount}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actionsGrid}>
          {showInvoice ? (
            <Pressable
              style={styles.actionTile}
              onPress={handleInvoice}
              disabled={fetchInvoice.isPending}
            >
              {fetchInvoice.isPending ? (
                <ActivityIndicator color={ORANGE} />
              ) : (
                <FileText color={ORANGE} size={18} strokeWidth={2.3} />
              )}
              <Text style={styles.actionTileText}>Invoice</Text>
            </Pressable>
          ) : null}
          {showCancel ? (
            <Pressable
              style={styles.actionTile}
              onPress={handleCancel}
              disabled={cancelOrder.isPending || cancelScheduled.isPending}
            >
              {cancelOrder.isPending || cancelScheduled.isPending ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <XCircle color="#DC2626" size={18} strokeWidth={2.3} />
              )}
              <Text style={[styles.actionTileText, { color: '#DC2626' }]}>
                {scheduled ? 'Cancel schedule' : 'Cancel order'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        {isActive ? (
          <Pressable style={styles.primaryBtn} onPress={openTracking}>
            <Truck color={WHITE} size={18} strokeWidth={2.4} />
            <Text style={styles.primaryBtnText}>Track order</Text>
          </Pressable>
        ) : completed ? (
          <View style={styles.actionRow}>
            {hasReviewed ? (
              <View style={styles.reviewedBtn}>
                <Star color={GREEN} size={15} fill={GREEN} />
                <Text style={styles.reviewedText}>
                  Rated {review.data?.rating}★
                </Text>
              </View>
            ) : (
              <Pressable style={styles.secondaryBtn} onPress={() =>
                router.push({
                  pathname: '/orders/[orderId]/review',
                  params: { orderId: data.id },
                })
              }>
                <Star color={ORANGE} size={15} strokeWidth={2.3} />
                <Text style={styles.secondaryBtnText}>Rate</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={handleReorder}
              disabled={reorder.isPending}
            >
              {reorder.isPending ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.primaryBtnText}>Order again</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.primaryBtn}
            onPress={handleReorder}
            disabled={reorder.isPending}
          >
            {reorder.isPending ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.primaryBtnText}>Order again</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function BillLine({
  label,
  value,
  free,
  green,
}: {
  label: string;
  value: number;
  free?: boolean;
  green?: boolean;
}) {
  return (
    <View style={styles.billLine}>
      <Text style={[styles.billLabel, green && { color: GREEN }]}>{label}</Text>
      {free ? (
        <Text style={[styles.billValue, { color: GREEN }]}>FREE</Text>
      ) : (
        <Text style={[styles.billValue, green && { color: GREEN }]}>
          {green
            ? `−₹${Math.abs(value).toFixed(2)}`
            : `₹${Number(value).toFixed(2)}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  headerGrad: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LINE,
  },
  headerTitles: { flex: 1 },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#FFD7B8',
  },
  helpBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: ORANGE,
  },
  heroCard: {
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  statusChipLive: { backgroundColor: ORANGE_SOFT },
  statusChipDone: { backgroundColor: '#ECFDF5' },
  statusChipCancel: { backgroundColor: '#FEF2F2' },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  statusChipText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: INK,
  },
  heroWhen: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: MUTED,
  },
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: INK,
    letterSpacing: -0.4,
  },
  heroSub: {
    marginTop: 4,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 12,
  },
  block: {},
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
  },
  cardEyebrow: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: MUTED,
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  routeIcons: {
    width: 32,
    alignItems: 'center',
  },
  routeDotRest: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeDotHome: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: LINE,
    marginVertical: 4,
  },
  routeLabel: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: MUTED,
    marginBottom: 2,
  },
  routeTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: ORANGE,
  },
  routeBody: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: INK,
    lineHeight: 18,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: LINE,
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  itemName: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: INK,
  },
  itemMeta: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  itemPrice: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: INK,
  },
  billLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
  },
  billValue: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: INK,
  },
  totalRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: LINE,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: INK,
  },
  totalValue: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: ORANGE,
  },
  payNote: {
    marginTop: 8,
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: MUTED,
    textAlign: 'right',
  },
  refundLink: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  refundLinkTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: INK,
  },
  refundLinkSub: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  tipCard: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  tipHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: INK,
  },
  tipSub: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
    lineHeight: 17,
  },
  tipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tipChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  tipChipOn: {
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1,
    borderColor: '#FFD8BF',
  },
  tipChipDisabled: {
    opacity: 0.6,
  },
  tipChipText: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: MUTED,
  },
  tipChipTextOn: {
    color: ORANGE,
    fontFamily: fonts.uiBold,
  },
  actionsGrid: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  actionTile: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  actionTileText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: INK,
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: WHITE,
  },
  secondaryBtn: {
    flex: 0.85,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFD7B8',
    backgroundColor: ORANGE_SOFT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: ORANGE,
  },
  reviewedBtn: {
    flex: 0.85,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reviewedText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: GREEN,
  },
});
