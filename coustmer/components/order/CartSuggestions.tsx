import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts } from '@/constants/typography';
import { addMenuItemToCart } from '@/lib/order/add-to-cart';
import { useFullMenu } from '@/lib/restaurant/hooks';
import type { MenuItem } from '@/lib/restaurant/types';
import { useCartStore } from '@/store/cart-store';

const ORANGE = '#F97316';
const TEXT = '#0B1220';
const WHITE = '#FFFFFF';

const ADDON_HINT =
  /drink|beverage|dessert|sweet|side|addon|add-on|fries|dip|shake|lassi|juice|soda|combo|starter|snack|chiller|mocktail|icecream|ice cream|brownie/i;

type Props = {
  restaurantId: string;
  restaurantName: string;
  cartItemIds: string[];
};

function scoreSuggestion(item: MenuItem): number {
  let score = 0;
  const blob = `${item.name} ${item.categoryName ?? ''} ${(item.tags ?? []).join(' ')}`;
  if (ADDON_HINT.test(blob)) score += 40;
  if (item.imageUrl) score += 15;
  if (item.rating && item.rating >= 4) score += 10;
  if (item.price > 0 && item.price <= 150) score += 12;
  if (item.price > 150 && item.price <= 250) score += 6;
  if (item.isAvailable === false) score -= 100;
  return score;
}

export function CartSuggestions({
  restaurantId,
  restaurantName,
  cartItemIds,
}: Props) {
  const menu = useFullMenu(restaurantId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const cartIds = useMemo(
    () => new Set(cartItemIds.map((id) => id.toLowerCase())),
    [cartItemIds]
  );

  const suggestions = useMemo(() => {
    const inCart = (item: MenuItem) => {
      const id = String(item.id).toLowerCase();
      const menuId = String(item.menuItemId ?? '').toLowerCase();
      return cartIds.has(id) || (menuId ? cartIds.has(menuId) : false);
    };

    return (menu.items ?? [])
      .filter((item) => item.isAvailable !== false)
      .filter((item) => item.price > 0 && Boolean(item.name?.trim()))
      .filter((item) => !inCart(item))
      .map((item) => ({ item, score: scoreSuggestion(item) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((row) => row.item);
  }, [menu.items, cartIds]);

  if (!restaurantId || menu.isLoading || !suggestions.length) {
    return null;
  }

  const handleAdd = (item: MenuItem) => {
    if (busyId) return;
    setBusyId(item.id);
    addMenuItemToCart(item, {
      id: restaurantId,
      name: restaurantName,
    });
    setTimeout(() => setBusyId(null), 450);
  };

  return (
    <LinearGradient
      colors={['#FFF7ED', '#FFFBF5', '#F8FAFC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={styles.glow} />

      <View style={styles.header}>
        <Text style={styles.kicker}>COMPLETE YOUR MEAL</Text>
        <Text style={styles.title}>Pair it with something good</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={132}
        contentContainerStyle={styles.row}
      >
        {suggestions.map((item) => {
          const imageUri =
            item.imageUrl ||
            'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=320&h=320&fit=crop';
          const busy = busyId === item.id;

          return (
            <View key={item.id} style={styles.tile}>
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(11,18,32,0.45)']}
                  style={styles.imageFade}
                />

                {item.isVeg != null ? (
                  <View
                    style={[
                      styles.vegBadge,
                      { borderColor: item.isVeg ? '#16A34A' : '#DC2626' },
                    ]}
                  >
                    <View
                      style={[
                        styles.vegDot,
                        {
                          backgroundColor: item.isVeg ? '#16A34A' : '#DC2626',
                        },
                      ]}
                    />
                  </View>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.addBtn,
                    pressed && styles.addBtnPressed,
                  ]}
                  disabled={busy}
                  onPress={() => handleAdd(item)}
                >
                  {busy ? (
                    <ActivityIndicator color={ORANGE} size="small" />
                  ) : (
                    <>
                      <Plus color={ORANGE} size={13} strokeWidth={3} />
                      <Text style={styles.addText}>ADD</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.price}>₹{Math.round(item.price)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

export function CartSuggestionsFromStore() {
  const restaurant = useCartStore((s) => s.restaurant);
  const items = useCartStore((s) => s.items);

  if (!restaurant?.id) return null;

  const cartItemIds = items.flatMap((i) =>
    [i.id, i.menuItemId].filter(Boolean) as string[]
  );

  return (
    <CartSuggestions
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      cartItemIds={cartItemIds}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    paddingTop: 18,
    paddingBottom: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(249,115,22,0.12)',
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 5,
  },
  kicker: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: ORANGE,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: TEXT,
    letterSpacing: -0.3,
  },
  row: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 2,
  },
  tile: {
    width: 120,
  },
  imageWrap: {
    width: 120,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F3EDE6',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFade: {
    ...StyleSheet.absoluteFillObject,
  },
  vegBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 14,
    height: 14,
    borderWidth: 1.4,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  addBtn: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    height: 34,
    borderRadius: 11,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  addBtnPressed: {
    backgroundColor: '#FFF7ED',
    transform: [{ scale: 0.97 }],
  },
  addText: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    color: ORANGE,
    letterSpacing: 0.6,
  },
  name: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: TEXT,
    lineHeight: 17,
    minHeight: 34,
  },
  price: {
    marginTop: 4,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: TEXT,
  },
});
