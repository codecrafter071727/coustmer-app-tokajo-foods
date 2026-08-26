import { addMenuItemToCart } from '@/lib/order/add-to-cart';
import {
  useRecommendedMenuItems,
  useRestaurantItems,
} from '@/lib/restaurant/hooks';
import { useCartStore } from '@/store/cart-store';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fonts } from '@/constants/typography';

/**
 * Same-restaurant add-ons based on recommended menu API.
 */
export function CartSuggestionsFromStore() {
  const restaurant = useCartStore((s) => s.restaurant);
  const cartItems = useCartStore((s) => s.items);
  const suggested = useRecommendedMenuItems(restaurant?.id ?? '');
  const allItems = useRestaurantItems(restaurant?.id ?? '', {}, {
    enabled: Boolean(restaurant?.id),
  });

  if (!restaurant?.id) {
    return null;
  }

  const cartItemIds = new Set(
    cartItems.map((item) => String(item.menuItemId ?? item.id))
  );

  const recommendedRows = (suggested.data ?? []).filter(
    (item) =>
      item.isAvailable !== false && !cartItemIds.has(String(item.id))
  );
  const fallbackRows = (allItems.data ?? []).filter(
    (item) =>
      item.isAvailable !== false && !cartItemIds.has(String(item.id))
  );
  const menuRows =
    (recommendedRows.length ? recommendedRows : fallbackRows).slice(0, 10);

  if (!menuRows.length) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Frequently added together</Text>
      <Text style={styles.subtitle}>From {restaurant.name}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {menuRows.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <Image
              source={{
                uri:
                  item.imageUrl ||
                  'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=400&auto=format&fit=crop',
              }}
              style={styles.image}
              contentFit="cover"
            />
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.price}>₹{Math.round(item.price)}</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                const ok = addMenuItemToCart(item, {
                  id: restaurant.id,
                  name: restaurant.name,
                  imageUrl: restaurant.imageUrl,
                });
                if (ok) {
                  Alert.alert('Added', `${item.name} added to cart`);
                }
              }}
            >
              <Plus color="#FFFFFF" size={14} strokeWidth={2.5} />
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    marginTop: 12,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: '#0B1220',
    paddingHorizontal: 14,
  },
  subtitle: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#64748B',
    paddingHorizontal: 14,
    marginTop: 2,
  },
  rail: {
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  itemCard: {
    width: 148,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    padding: 8,
  },
  image: {
    width: '100%',
    height: 84,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  name: {
    marginTop: 8,
    minHeight: 34,
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#0B1220',
  },
  price: {
    marginTop: 4,
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#0B1220',
  },
  addBtn: {
    marginTop: 8,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addText: {
    color: '#FFFFFF',
    fontFamily: fonts.uiBold,
    fontSize: 12,
  },
});
