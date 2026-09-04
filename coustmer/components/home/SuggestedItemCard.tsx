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
};

/**
 * Suggested dish card — Swiggy/Zomato style:
 * big food photo, rating chip, clean type, ADD CTA.
 */
export function SuggestedItemCard({ dish, onPress }: Props) {
  const price = dish.price > 0 ? `₹${Math.round(dish.price)}` : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${dish.name}, ${dish.restaurantName}`}
    >
      <View style={styles.imageWrap}>
        {dish.imageUrl ? (
          <Image
            source={{ uri: dish.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={220}
            cachePolicy="memory-disk"
          />
        ) : (
          <LinearGradient colors={['#2A2623', '#151311']} style={styles.image} />
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)']}
          style={styles.fade}
        />

        {dish.isVeg != null ? (
          <View style={styles.vegWrap}>
            <View
              style={[
                styles.vegBox,
                { borderColor: dish.isVeg ? '#0F8A3B' : '#C62828' },
              ]}
            >
              <View
                style={[
                  styles.vegDot,
                  { backgroundColor: dish.isVeg ? '#0F8A3B' : '#C62828' },
                ]}
              />
            </View>
          </View>
        ) : null}

        {typeof dish.rating === 'number' && dish.rating > 0 ? (
          <View style={styles.ratingPill}>
            <Text style={styles.ratingNum}>{dish.rating.toFixed(1)}</Text>
            <Star color="#FFF" fill="#FFF" size={9} />
          </View>
        ) : (
          <View style={styles.suggestedPill}>
            <Text style={styles.suggestedText}>SUGGESTED</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {dish.name}
        </Text>
        <Text style={styles.restaurant} numberOfLines={1}>
          {dish.restaurantName}
        </Text>

        <View style={styles.footer}>
          {price ? <Text style={styles.price}>{price}</Text> : <View />}
          <View style={styles.addChip}>
            <Text style={styles.addText}>ADD</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const CARD_W = 158;
const IMAGE_RADIUS = 22;

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'visible',
    paddingTop: 8,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.985 }],
  },
  imageWrap: {
    width: '100%',
    height: 142,
    borderRadius: IMAGE_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#E8E4E1',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: IMAGE_RADIUS,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 52,
    borderBottomLeftRadius: IMAGE_RADIUS,
    borderBottomRightRadius: IMAGE_RADIUS,
  },
  vegWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    padding: 3,
  },
  vegBox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
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
    borderRadius: 6,
  },
  ratingNum: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: fonts.uiBold,
  },
  suggestedPill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(28,28,28,0.78)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suggestedText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: fonts.uiBold,
    letterSpacing: 0.6,
  },
  body: {
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 12,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: '#1C1C1C',
    lineHeight: 18,
    minHeight: 36,
    letterSpacing: -0.25,
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
    letterSpacing: -0.2,
  },
  addChip: {
    borderWidth: 1.4,
    borderColor: '#AC0F45',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 52,
    alignItems: 'center',
  },
  addText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#AC0F45',
    letterSpacing: 0.8,
  },
});

export const SUGGESTED_CARD_WIDTH = CARD_W;
