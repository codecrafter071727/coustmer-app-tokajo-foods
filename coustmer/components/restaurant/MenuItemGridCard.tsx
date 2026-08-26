import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Minus, Plus } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { VegBadge } from '@/components/restaurant/MenuBadges';
import { authTheme } from '@/constants/auth-theme';
import {
  decrementCartItem,
  incrementCartItem,
} from '@/lib/order/add-to-cart';
import type { MenuItem } from '@/lib/restaurant/types';
import { playHapticFeedback } from '@/lib/utils/haptics';
import { useCartStore } from '@/store/cart-store';

type Props = {
  item: MenuItem;
  onPress?: () => void;
  onAdd?: () => void;
  highlighted?: boolean;
};

function originalPrice(item: MenuItem): number | null {
  const raw = item.originalPrice ?? item.mrp ?? item.compareAtPrice;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= item.price) return null;
  return n;
}

export function MenuItemGridCard({ item, onPress, onAdd, highlighted }: Props) {
  const highlight = useSharedValue(0);
  const was = originalPrice(item);
  const hasCustomizations =
    item.hasCustomizations === true ||
    (Array.isArray(item.modifierGroups) && item.modifierGroups.length > 0);

  const quantity = useCartStore((s) =>
    s.items
      .filter((i) => i.id === item.id || i.menuItemId === item.id)
      .reduce((n, i) => n + i.quantity, 0)
  );

  useEffect(() => {
    if (highlighted) {
      highlight.value = 0;
      highlight.value = withSequence(
        withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
        withDelay(
          2400,
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })
        )
      );
    } else {
      highlight.value = withTiming(0, { duration: 280 });
    }
  }, [highlighted, highlight]);

  const highlightStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      highlight.value,
      [0, 1],
      ['transparent', 'rgba(255, 90, 65, 0.08)']
    ),
    borderRadius: 16,
    transform: [{ scale: 1 + highlight.value * 0.01 }],
  }));

  const openCustomise = () => {
    playHapticFeedback();
    if (onAdd) onAdd();
    else onPress?.();
  };

  return (
    <Animated.View style={[styles.wrap, highlightStyle]}>
      <Pressable onPress={onPress} style={styles.card}>
        <View style={styles.imageWrap}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              contentFit="cover"
              recyclingKey={item.id}
              transition={180}
            />
          ) : (
            <LinearGradient colors={['#FFF7ED', '#FFEDD5']} style={styles.image} />
          )}

          {item.isAvailable !== false ? (
            quantity > 0 && !hasCustomizations ? (
              <View style={styles.gridStepperWrap}>
                <Pressable
                  style={styles.gridStepperBtn}
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    playHapticFeedback();
                    void decrementCartItem(item.id);
                  }}
                >
                  <Minus color="#FFFFFF" size={14} strokeWidth={3} />
                </Pressable>
                <Text style={styles.gridStepperValue}>{quantity}</Text>
                <Pressable
                  style={styles.gridStepperBtn}
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    playHapticFeedback();
                    void incrementCartItem(item.id);
                  }}
                >
                  <Plus color="#FFFFFF" size={14} strokeWidth={3} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.addBtn}
                hitSlop={6}
                onPress={(e) => {
                  e.stopPropagation?.();
                  openCustomise();
                }}
                accessibilityLabel={
                  hasCustomizations ? `Customise ${item.name}` : `Add ${item.name}`
                }
              >
                {quantity > 0 && hasCustomizations ? (
                  <Text style={styles.qtyBadgeText}>{quantity}</Text>
                ) : (
                  <Plus color="#FFFFFF" size={18} strokeWidth={2.8} />
                )}
              </Pressable>
            )
          ) : (
            <View style={styles.unavailablePill}>
              <Text style={styles.unavailableText}>Sold out</Text>
            </View>
          )}
        </View>

        <View style={styles.titleRow}>
          <VegBadge isVeg={item.isVeg} />
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{item.price.toFixed(0)}</Text>
          {was != null ? (
            <Text style={styles.wasPrice}>₹{was.toFixed(0)}</Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  card: {
    paddingBottom: 10,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  addBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: authTheme.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: authTheme.brandDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  unavailablePill: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unavailableText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingRight: 4,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: authTheme.brand,
  },
  wasPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  gridStepperWrap: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: authTheme.brand,
    borderRadius: 18,
    paddingHorizontal: 8,
    gap: 8,
    shadowColor: authTheme.brandDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  gridStepperBtn: {
    padding: 2,
  },
  gridStepperValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  qtyBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    minWidth: 14,
    textAlign: 'center',
  },
});
