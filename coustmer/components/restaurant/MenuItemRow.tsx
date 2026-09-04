import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { Minus, Plus, Star, UtensilsCrossed } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { VegBadge } from '@/components/restaurant/MenuBadges';
import {
  decrementCartItem,
  incrementCartItem,
} from '@/lib/order/add-to-cart';
import { resolveMenuItemImage } from '@/lib/restaurant/menu-item-images';
import type { MenuItem } from '@/lib/restaurant/types';
import { playHapticFeedback } from '@/lib/utils/haptics';
import { useCartStore } from '@/store/cart-store';

type Props = {
  item: MenuItem;
  onPress?: () => void;
  onAdd?: () => void;
  highlighted?: boolean;
  unavailable?: boolean;
};

export function MenuItemRow({ item, onPress, onAdd, unavailable: forceUnavailable }: Props) {
  const quantity = useCartStore((s) =>
    s.items
      .filter((i) => i.menuItemId === item.id || i.id === item.id)
      .reduce((n, i) => n + i.quantity, 0)
  );

  const available = item.isAvailable !== false && !forceUnavailable;
  const photoUri = resolveMenuItemImage(item.name, item.imageUrl);
  const hasCustomizations =
    item.hasCustomizations === true ||
    (Array.isArray(item.modifierGroups) && item.modifierGroups.length > 0);

  const handleAdd = (e: any) => {
    e.stopPropagation?.();
    if (!available) return;
    playHapticFeedback();
    // Customisable dishes always open the sheet so Half/Full / add-ons are chosen.
    if (hasCustomizations && onAdd) {
      onAdd();
      return;
    }
    if (quantity === 0 && onAdd) {
      onAdd();
    } else {
      void incrementCartItem(item.id);
    }
  };

  const handleDecrement = (e: any) => {
    e.stopPropagation?.();
    playHapticFeedback();
    if (hasCustomizations) {
      onPress?.();
      return;
    }
    void decrementCartItem(item.id);
  };

  return (
    <Pressable
      style={[styles.card, !available && styles.cardUnavailable]}
      onPress={onPress}
    >
      <View style={styles.leftCol}>
        <View style={styles.badgeRow}>
          <VegBadge isVeg={item.isVeg} />
          {item.isBestSeller ? (
            <View style={styles.tagBest}>
              <Text style={styles.tagBestText}>Bestseller</Text>
            </View>
          ) : null}
          {item.isRecommended ? (
            <View style={styles.tagRec}>
              <Text style={styles.tagRecText}>Chef’s special</Text>
            </View>
          ) : null}
          {item.isNew ? (
            <View style={styles.tagNew}>
              <Text style={styles.tagNewText}>New</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        {typeof item.rating === 'number' && item.rating > 0 ? (
          <View style={styles.ratingRow}>
            <Star color="#F59E0B" fill="#F59E0B" size={11} />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            {typeof item.reviewCount === 'number' && item.reviewCount > 0 ? (
              <Text style={styles.reviewCount}>({item.reviewCount})</Text>
            ) : null}
          </View>
        ) : null}
        {item.description ? (
          <Text style={styles.desc} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}
        <Text style={styles.price}>₹{item.price}</Text>
        {!available ? (
          <Text style={styles.soldOut}>Currently unavailable</Text>
        ) : null}
      </View>

      <View style={styles.rightCol}>
        <View style={styles.imageWrap}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={[styles.image, !available && styles.imageDim]}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.image,
                styles.imagePlaceholder,
                !available && styles.imageDim,
              ]}
            >
              <UtensilsCrossed color="#94A3B8" size={22} strokeWidth={1.8} />
            </View>
          )}
          <View style={styles.addBtnWrap}>
            {!available ? (
              <View style={styles.unavailableBtn}>
                <Text style={styles.unavailableBtnText}>Sold out</Text>
              </View>
            ) : quantity > 0 ? (
              <View style={styles.stepperContainer}>
                <Pressable
                  onPress={handleDecrement}
                  hitSlop={8}
                  style={styles.stepperBtn}
                >
                  <Minus color="#FFFFFF" size={14} strokeWidth={3} />
                </Pressable>
                <Text style={styles.stepperText}>{quantity}</Text>
                <Pressable
                  onPress={handleAdd}
                  hitSlop={8}
                  style={styles.stepperBtn}
                >
                  <Plus color="#FFFFFF" size={14} strokeWidth={3} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.addButton} onPress={handleAdd}>
                <Text style={styles.addButtonText}>
                  {hasCustomizations ? 'CUSTOMISE' : '+ ADD'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  cardUnavailable: {
    opacity: 0.72,
  },
  leftCol: {
    flex: 1,
    paddingRight: 16,
    justifyContent: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tagBest: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagBestText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2410C',
  },
  tagRec: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagRecText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
  },
  tagNew: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagNewText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202020',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  reviewCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  desc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  soldOut: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  rightCol: {
    width: 120,
  },
  imageWrap: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'visible',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  imageDim: {
    opacity: 0.55,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addBtnWrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: -12,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F3744B',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: '#F3744B',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  unavailableBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unavailableBtnText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3744B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 10,
  },
  stepperBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    minWidth: 16,
    textAlign: 'center',
  },
});
