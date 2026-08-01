import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { Heart, Minus, Plus, Share2, X, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { VegBadge } from '@/components/restaurant/MenuBadges';
import {
  addMenuItemToCart,
  decrementCartItem,
  incrementCartItem,
} from '@/lib/order/add-to-cart';
import type { MenuItem } from '@/lib/restaurant/types';
import { playHapticFeedback } from '@/lib/utils/haptics';
import { useCartStore } from '@/store/cart-store';

type MenuItemDetailSheetProps = {
  item: MenuItem | null;
  restaurantId: string;
  restaurantName: string;
  restaurantImageUrl?: string;
  visible?: boolean;
  onClose: () => void;
};

export function MenuItemDetailSheet({
  item,
  restaurantId,
  restaurantName,
  restaurantImageUrl,
  visible = true,
  onClose,
}: MenuItemDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);

  const [selectedSize, setSelectedSize] = useState('15 cm ( Half )');

  const quantity = useCartStore(
    (s) =>
      s.items.find((i) => i.id === item?.id || i.menuItemId === item?.id)
        ?.quantity || 0
  );

  const handleAdd = () => {
    if (!item) return;
    playHapticFeedback();

    if (quantity === 0) {
      addMenuItemToCart(item, {
        id: restaurantId,
        name: restaurantName,
        imageUrl: restaurantImageUrl,
      });
    } else {
      void incrementCartItem(item.id);
    }
  };

  const handleDecrement = () => {
    if (!item) return;
    playHapticFeedback();
    void decrementCartItem(item.id);
  };

  if (!item) return null;

  const unitPrice = item.price ?? 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { marginTop: insets.top + 120 }]}>

          {/* Floating close button */}
          <View style={styles.closeBtnWrap}>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X color="#202020" size={20} strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* Hero Image */}
            <View style={styles.heroWrap}>
              <Image
                source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop' }}
                style={styles.heroImg}
                contentFit="cover"
              />
              <View style={styles.heroActions}>
                <Pressable style={styles.iconCircle}>
                  <Share2 color="#E87431" size={18} strokeWidth={2.5} />
                </Pressable>
                <Pressable
                  style={styles.iconCircle}
                  onPress={() => setFavorited(!favorited)}
                >
                  <Heart
                    color="#E87431"
                    size={18}
                    strokeWidth={2.5}
                    fill={favorited ? '#E87431' : 'transparent'}
                  />
                </Pressable>
              </View>
            </View>

            {/* Details */}
            <View style={styles.detailsBlock}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{item.name}</Text>
                <VegBadge isVeg={item.isVeg} />
              </View>

              <Text style={styles.description}>
                {item.description || 'Serving size: 15cm - 33 g protein / 678 kcal / 299 g, 30cm - 66 g protein / 1356 kcal / 598 g. Double the paneer, with real mozz cheese. Indulge in hot cheesy paneer melt loaded with paneer, tangy tandoori sauce, fresh veggies and cheese slice. Allergens - contains cereals containing gluten, milk, soy.'}
              </Text>

              <Text style={styles.priceText}>₹{unitPrice}</Text>
            </View>

            {/* Size Options Mock */}
            <View style={styles.optionsCard}>
              <Text style={styles.optionsTitle}>Size</Text>

              <Pressable
                style={styles.optionRow}
                onPress={() => setSelectedSize('15 cm ( Half )')}
              >
                <View style={styles.radioContainer}>
                  <View style={[styles.radioOuter, selectedSize === '15 cm ( Half )' && styles.radioOuterSelected]}>
                    {selectedSize === '15 cm ( Half )' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.optionName}>15 cm ( Half )</Text>
                </View>
                <Text style={styles.optionPrice}>₹{unitPrice}</Text>
              </Pressable>

              <Pressable
                style={styles.optionRow}
                onPress={() => setSelectedSize('30 cm ( Full )')}
              >
                <View style={styles.radioContainer}>
                  <View style={[styles.radioOuter, selectedSize === '30 cm ( Full )' && styles.radioOuterSelected]}>
                    {selectedSize === '30 cm ( Full )' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.optionName}>30 cm ( Full )</Text>
                </View>
                <Text style={styles.optionPrice}>₹{unitPrice * 2}</Text>
              </Pressable>
            </View>

          </ScrollView>

          {/* Bottom Bar */}
          <View style={[styles.bottomBarWrap, { paddingBottom: 12 }]}>
            {quantity === 0 ? (
              <Pressable style={styles.addToCartPillCentered} onPress={handleAdd}>
                <Text style={styles.addToCartText}>Add to cart</Text>
              </Pressable>
            ) : (
              <View style={styles.addToCartPill}>
                <View style={styles.stepperWrap}>
                  <Pressable onPress={handleDecrement} style={styles.stepperBtn} hitSlop={10}>
                    <Minus color="#202020" size={16} strokeWidth={2.5} />
                  </Pressable>
                  <Text style={styles.stepperVal}>{quantity}</Text>
                  <Pressable onPress={handleAdd} style={styles.stepperBtn} hitSlop={10}>
                    <Plus color="#202020" size={16} strokeWidth={2.5} />
                  </Pressable>
                </View>

                <Pressable
                  style={styles.viewCartRight}
                  onPress={() => {
                    onClose();
                    router.push('/cart');
                  }}
                >
                  <Text style={styles.addToCartText}>View Cart</Text>
                  <ChevronRight color="#FFFFFF" size={20} style={{ marginLeft: 4 }} />
                </Pressable>
              </View>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: '#EEEEEE',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    position: 'relative',
  },
  closeBtnWrap: {
    position: 'absolute',
    top: -64,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  heroWrap: {
    width: '100%',
    height: 260,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  heroImg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  heroActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsBlock: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#202020',
    paddingRight: 16,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#202020',
  },
  optionsCard: {
    backgroundColor: '#E5E5E5',
    borderRadius: 24,
    padding: 20,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202020',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: '#E87431',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E87431',
  },
  optionName: {
    fontSize: 16,
    color: '#202020',
    fontWeight: '500',
  },
  optionPrice: {
    fontSize: 16,
    color: '#202020',
    fontWeight: '700',
  },
  bottomBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#EEEEEE',
  },
  addToCartPillCentered: {
    backgroundColor: '#E87431',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    paddingVertical: 18,
    shadowColor: '#E87431',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addToCartPill: {
    backgroundColor: '#E87431',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 30,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    shadowColor: '#E87431',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  viewCartRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 10,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  stepperWrap: {
    backgroundColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 100,
  },
  stepperBtn: {
    padding: 2,
  },
  stepperVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202020',
  },
});
