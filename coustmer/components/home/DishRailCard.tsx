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

export function DishRailCard({ dish: item, onPress }: Props) {
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
            transition={180}
          />
        ) : (
          <LinearGradient colors={['#2D2A26', '#1A1816']} style={styles.image} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.45)']}
          style={styles.imageFade}
        />
        {item.badge ? (
          <View style={styles.dishBadge}>
            <Text style={styles.dishBadgeText} numberOfLines={1}>
              {item.badge}
            </Text>
          </View>
        ) : null}
        {item.isVeg != null ? (
          <View
            style={[
              styles.vegMark,
              { borderColor: item.isVeg ? '#22C55E' : '#EF4444' },
            ]}
          >
            <View
              style={[
                styles.vegDot,
                { backgroundColor: item.isVeg ? '#22C55E' : '#EF4444' },
              ]}
            />
          </View>
        ) : null}
        {item.rating != null && item.rating > 0 ? (
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Star color="#FFF" fill="#FFF" size={9} />
          </View>
        ) : null}
      </View>

      <Text style={styles.dishName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.price}>
        {item.price > 0 ? `₹${Math.round(item.price)}` : ' '}
      </Text>
      <Text style={styles.restaurant} numberOfLines={1}>
        {item.restaurantName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 156,
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.985 }] },
  imageWrap: {
    width: '100%',
    height: 128,
    backgroundColor: '#1A1816',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imageFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
  },
  dishBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    maxWidth: '72%',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  dishBadgeText: { color: '#FFF', fontSize: 10, fontFamily: fonts.uiBold },
  vegMark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  ratingPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1BA672',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  ratingText: { color: '#FFF', fontSize: 11, fontFamily: fonts.uiBold },
  dishName: {
    marginTop: 10,
    marginHorizontal: 11,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: '#1C1C1C',
    lineHeight: 18,
    minHeight: 36,
    letterSpacing: -0.2,
  },
  price: {
    marginTop: 2,
    marginHorizontal: 11,
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: '#AC0F45',
  },
  restaurant: {
    marginTop: 3,
    marginHorizontal: 11,
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#8A8A8A',
  },
});
