import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { Heart, Minus, Plus } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { VegBadge } from '@/components/restaurant/MenuBadges';
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

export function MenuItemRow({ item, onPress, onAdd }: Props) {
  const quantity = useCartStore(
    (s) =>
      s.items.find((i) => i.id === item.id || i.menuItemId === item.id)
        ?.quantity || 0
  );

  const handleAdd = (e: any) => {
    e.stopPropagation?.();
    playHapticFeedback();
    if (quantity === 0 && onAdd) {
      onAdd();
    } else {
      void incrementCartItem(item.id);
    }
  };

  const handleDecrement = (e: any) => {
    e.stopPropagation?.();
    playHapticFeedback();
    void decrementCartItem(item.id);
  };

  const currentPrice = item.price;
  
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.leftCol}>
        <View style={styles.vegRow}>
          <VegBadge isVeg={item.isVeg} />
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.desc} numberOfLines={3}>
          {item.description || 'Serving size: 15cm - 33 g protein / 678 kcal / 299 g, 30cm - 66 g protein...more'}
        </Text>
        <Text style={styles.price}>₹{currentPrice}</Text>
      </View>

      <View style={styles.rightCol}>
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&auto=format&fit=crop' }}
            style={styles.image}
            contentFit="cover"
          />
          <Pressable style={styles.heartBtn}>
            <Heart color="#F3744B" size={16} strokeWidth={2} />
          </Pressable>
          <View style={styles.addBtnWrap}>
            {quantity > 0 ? (
              <View style={styles.stepperContainer}>
                <Pressable onPress={handleDecrement} hitSlop={8} style={styles.stepperBtn}>
                  <Minus color="#FFFFFF" size={14} strokeWidth={3} />
                </Pressable>
                <Text style={styles.stepperText}>{quantity}</Text>
                <Pressable onPress={handleAdd} hitSlop={8} style={styles.stepperBtn}>
                  <Plus color="#FFFFFF" size={14} strokeWidth={3} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.addButton} onPress={handleAdd}>
                <Text style={styles.addButtonText}>+ ADD</Text>
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
  leftCol: {
    flex: 1,
    paddingRight: 16,
    justifyContent: 'flex-start',
  },
  vegRow: {
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202020',
    marginBottom: 6,
  },
  desc: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
    marginBottom: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202020',
  },
  rightCol: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnWrap: {
    position: 'absolute',
    bottom: -14,
    alignSelf: 'center',
    shadowColor: '#F3744B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  addButton: {
    backgroundColor: '#F3744B',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  stepperContainer: {
    backgroundColor: '#F3744B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    width: 80,
  },
  stepperBtn: {
    padding: 2,
  },
  stepperText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
