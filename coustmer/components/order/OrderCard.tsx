import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, MapPinned, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/typography';
import { useRepeatOrder } from '@/lib/cart/hooks';
import { useReorder } from '@/lib/order/hooks';
import { ORDER_STATUS_LABELS, type Order } from '@/lib/order/types';
import { resolveMenuItemImage } from '@/lib/restaurant/menu-item-images';

function formatOrderWhen(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const time = d
    .toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase()
    .replace(' ', '');
  return `${date} • ${time}`;
}

type Props = {
  order: Order;
};

const BRAND_ORANGE = '#F3744B';
const TEXT_DARK = '#202020';
const TEXT_MUTED = '#9CA3AF';

export function OrderCard({ order }: Props) {
  const router = useRouter();
  const reorder = useReorder(order.id);
  const repeatOrder = useRepeatOrder();
  const [expanded, setExpanded] = useState(false);

  const headline =
    order.restaurantName || order.items[0]?.name || 'Your order';
  const firstItem = order.items[0];
  const cover = firstItem
    ? resolveMenuItemImage(firstItem.name, firstItem.imageUrl)
    : typeof order.restaurantImageUrl === 'string'
      ? order.restaurantImageUrl
      : resolveMenuItemImage('plated');
  const when = formatOrderWhen(order.createdAt || order.scheduledFor);
  const total =
    typeof order.total === 'number'
      ? order.total
      : order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  const statusLower = order.status.toLowerCase();
  const isDelivered = statusLower === 'delivered';
  const isActive = ![
    'delivered',
    'cancelled',
    'canceled',
    'rejected',
    'failed',
    'completed',
  ].includes(statusLower);
  const canReorder = !isActive;
  const statusLabel = isDelivered
    ? 'Delivered'
    : ORDER_STATUS_LABELS[order.status] ?? order.status;

  const openTracking = () => {
    router.push({
      pathname: '/orders/[orderId]/tracking',
      params: { orderId: order.id },
    });
  };

  const openDetail = () => {
    router.push({
      pathname: isActive
        ? '/orders/[orderId]/tracking'
        : '/orders/[orderId]',
      params: { orderId: order.id },
    });
  };

  const handleReorder = () => {
    Alert.alert('Order again?', 'Add the same items to your cart.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Order again',
        onPress: async () => {
          try {
            await repeatOrder.mutateAsync(order.id);
            Alert.alert('Added to cart', 'Your previous order items were added again.', [
              {
                text: 'Go to cart',
                onPress: () => router.push('/cart' as import('expo-router').Href),
              },
            ]);
            return;
          } catch {
            // Fallback to order-service reorder for older backend variants.
          }

          try {
            const next = await reorder.mutateAsync();
            if (next.mode === 'order' && next.order?.id) {
              Alert.alert('Order placed', 'Your reorder was created.', [
                {
                  text: 'View order',
                  onPress: () =>
                    router.push({
                      pathname: '/orders/[orderId]/tracking',
                      params: { orderId: next.order!.id },
                    }),
                },
              ]);
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

  return (
    <Pressable style={styles.card} onPress={openDetail}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{when}</Text>
        <View style={[styles.statusPill, isActive && styles.statusPillLive]}>
          {isActive ? <View style={styles.liveDot} /> : null}
          <Text style={[styles.statusText, isActive && styles.statusTextLive]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Pressable
        style={styles.mainItemRow}
        onPress={() => setExpanded(!expanded)}
      >
        <Image
          source={{ uri: cover }}
          style={styles.mainThumb}
          contentFit="cover"
        />
        <View style={styles.mainItemInfo}>
          <Text style={styles.mainItemTitle} numberOfLines={1}>
            {headline}
          </Text>
          <Text style={styles.orderIdText}>
            Order ID: {order.orderNumber || order.id.slice(0, 8)}
          </Text>
        </View>
        <View style={styles.itemsCountWrap}>
          <Text style={styles.itemsCountText}>{order.items.length} Items</Text>
          {expanded ? (
            <ChevronUp color={TEXT_MUTED} size={16} strokeWidth={2.5} />
          ) : (
            <ChevronDown color={TEXT_MUTED} size={16} strokeWidth={2.5} />
          )}
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.itemsList}>
          {order.items.map((item, index) => {
            const originalPrice = (item.price + 2).toFixed(2);
            const currentPrice = item.price.toFixed(2);
            const itemThumb = resolveMenuItemImage(item.name, item.imageUrl);

            return (
              <View key={index} style={styles.itemRow}>
                <Image
                  source={{ uri: itemThumb }}
                  style={styles.itemThumb}
                  contentFit="cover"
                />
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.priceWrap}>
                  <Text style={styles.priceCurrent}>₹{currentPrice}</Text>
                  <Text style={styles.priceOriginal}>₹{originalPrice}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.summaryFooter}>
        <Text style={styles.summaryLeft}>
          <Text style={styles.summaryGrand}>Grand</Text> VAT Include
        </Text>
        <Text style={styles.summaryTotal}>Total: ₹{total.toFixed(2)}</Text>
      </View>

      {isActive ? (
        <Pressable style={styles.trackBtn} onPress={openTracking}>
          <MapPinned color="#FFFFFF" size={18} strokeWidth={2.3} />
          <Text style={styles.trackBtnText}>Track order</Text>
        </Pressable>
      ) : canReorder ? (
        <Pressable style={styles.orderAgainBtn} onPress={handleReorder}>
          <Truck color={BRAND_ORANGE} size={20} strokeWidth={2} />
          <Text style={styles.orderAgainText}>Order Again</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  dateText: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: '#6B7280',
  },
  statusPill: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusPillLive: {
    backgroundColor: '#FFF7ED',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  statusText: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: TEXT_DARK,
  },
  statusTextLive: {
    color: BRAND_ORANGE,
    fontFamily: fonts.uiBold,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  mainItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  mainThumb: {
    width: 72,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  mainItemInfo: {
    flex: 1,
  },
  mainItemTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    color: TEXT_DARK,
    marginBottom: 4,
  },
  orderIdText: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: TEXT_MUTED,
  },
  itemsCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemsCountText: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: TEXT_MUTED,
  },
  itemsList: {
    gap: 16,
    marginBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  itemName: {
    flex: 1,
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: TEXT_DARK,
    paddingRight: 12,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceCurrent: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: BRAND_ORANGE,
  },
  priceOriginal: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: TEXT_MUTED,
    textDecorationLine: 'line-through',
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryLeft: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: '#6B7280',
  },
  summaryGrand: {
    fontFamily: fonts.displaySemi,
    color: TEXT_DARK,
  },
  summaryTotal: {
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    color: '#4B5563',
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: BRAND_ORANGE,
  },
  trackBtnText: {
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    color: '#FFFFFF',
  },
  orderAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BRAND_ORANGE,
  },
  orderAgainText: {
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    color: BRAND_ORANGE,
  },
});
