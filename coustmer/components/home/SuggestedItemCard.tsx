import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/typography';
import type { HomeTrendingDish } from '@/lib/home/types';

type Props = {
  dish: HomeTrendingDish;
  onPress: () => void;
};

/** Swiggy-style suggestion card — large food photo, price, kitchen name. */
export function SuggestedItemCard({ dish, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.imageWrap}>
        {dish.imageUrl ? (
          <Image
            source={{ uri: dish.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <LinearGradient colors={['#3F3A36', '#1C1917']} style={styles.image} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={styles.fade}
        />
        {dish.isVeg != null ? (
          <View
            style={[
              styles.veg,
              { borderColor: dish.isVeg ? '#22C55E' : '#EF4444' },
            ]}
          >
            <View
              style={[
                styles.vegDot,
                { backgroundColor: dish.isVeg ? '#22C55E' : '#EF4444' },
              ]}
            />
          </View>
        ) : null}
        {dish.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {dish.badge}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {dish.name}
        </Text>
        <Text style={styles.restaurant} numberOfLines={1}>
          {dish.restaurantName}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.price}>
            {dish.price > 0 ? `₹${Math.round(dish.price)}` : '—'}
          </Text>
          <View style={styles.addBtn}>
            <Plus color="#AC0F45" size={16} strokeWidth={2.6} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 168,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.98 }] },
  imageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: '#1C1917',
  },
  image: { width: '100%', height: '100%' },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
  },
  veg: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 16,
    height: 16,
    borderWidth: 1.6,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  vegDot: { width: 7, height: 7, borderRadius: 3.5 },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(172,15,69,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '70%',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: fonts.uiBold,
    letterSpacing: 0.2,
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 14.5,
    color: '#1C1C1C',
    lineHeight: 19,
    minHeight: 38,
    letterSpacing: -0.2,
  },
  restaurant: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#8A8A8A',
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: '#1C1C1C',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1.4,
    borderColor: '#F3C0CE',
    backgroundColor: '#FFF5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
