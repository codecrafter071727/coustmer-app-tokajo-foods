import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/typography';
import type { HomeTrendingDish } from '@/lib/home/types';

type Props = {
  dish: HomeTrendingDish;
  onPress: () => void;
  /** Softer “order again” styling */
  reorder?: boolean;
};

const CARD_W = 158;
const IMG_RADIUS = 20;

/** Dish rail card — rounded inset photo + ADD, matches Suggested for you. */
export function DishRailCard({ dish: item, onPress, reorder = false }: Props) {
  const price = item.price > 0 ? `₹${Math.round(item.price)}` : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.imageWrap}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <LinearGradient colors={['#2D2A26', '#1A1816']} style={styles.image} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.38)']}
          style={styles.imageFade}
        />

        {item.isVeg != null ? (
          <View style={styles.vegWrap}>
            <View
              style={[
                styles.vegMark,
                { borderColor: item.isVeg ? '#0F8A3B' : '#C62828' },
              ]}
            >
              <View
                style={[
                  styles.vegDot,
                  { backgroundColor: item.isVeg ? '#0F8A3B' : '#C62828' },
                ]}
              />
            </View>
          </View>
        ) : null}

        {item.rating != null && item.rating > 0 ? (
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Star color="#FFF" fill="#FFF" size={9} />
          </View>
        ) : item.badge ? (
          <View style={[styles.dishBadge, reorder && styles.dishBadgeReorder]}>
            <Text style={styles.dishBadgeText} numberOfLines={1}>
              {item.badge}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.dishName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.restaurant} numberOfLines={1}>
          {item.restaurantName}
        </Text>
        <View style={styles.footer}>
          {price ? <Text style={styles.price}>{price}</Text> : <View />}
          <View style={[styles.addChip, reorder && styles.addChipReorder]}>
            <Text style={[styles.addText, reorder && styles.addTextReorder]}>
              {reorder ? 'AGAIN' : 'ADD'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export const DISH_RAIL_CARD_WIDTH = CARD_W;

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.11,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.985 }] },
  imageWrap: {
    width: '100%',
    height: 132,
    borderRadius: IMG_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#1A1816',
    position: 'relative',
  },
  image: { width: '100%', height: '100%', borderRadius: IMG_RADIUS },
  imageFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
  },
  vegWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FFF',
    borderRadius: 5,
    padding: 3,
  },
  vegMark: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  dishBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    maxWidth: '78%',
    backgroundColor: 'rgba(28,28,28,0.78)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  dishBadgeReorder: { backgroundColor: 'rgba(234,88,12,0.92)' },
  dishBadgeText: { color: '#FFF', fontSize: 10, fontFamily: fonts.uiBold },
  ratingPill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1BA672',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  ratingText: { color: '#FFF', fontSize: 11, fontFamily: fonts.uiBold },
  body: { paddingHorizontal: 4, paddingTop: 10 },
  dishName: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: '#1C1C1C',
    lineHeight: 18,
    minHeight: 36,
    letterSpacing: -0.2,
  },
  restaurant: {
    marginTop: 3,
    fontFamily: fonts.uiMedium,
    fontSize: 11.5,
    color: '#7A7A7A',
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: '#1C1C1C',
  },
  addChip: {
    borderWidth: 1.4,
    borderColor: '#AC0F45',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 52,
    alignItems: 'center',
  },
  addChipReorder: { borderColor: '#EA580C' },
  addText: {
    fontFamily: fonts.uiBold,
    fontSize: 11.5,
    color: '#AC0F45',
    letterSpacing: 0.7,
  },
  addTextReorder: { color: '#EA580C' },
});
