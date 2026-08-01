import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Tag } from 'lucide-react-native';
import { Platform,  StyleSheet, Text, View } from 'react-native';

import { FavoriteHeartButton } from '@/components/common/FavoriteHeartButton';
import { authTheme } from '@/constants/auth-theme';
import type { Restaurant } from '@/lib/restaurant/types';

type Props = {
  restaurant: Restaurant;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onToggleFavorite?: (id: string) => void;
  onPress?: () => void;
};

function priceLevel(price?: number) {
  if (!price) return '$$';
  if (price < 300) return '$';
  if (price < 600) return '$$';
  return '$$$';
}

function formatReviews(n?: number) {
  if (!n || n <= 0) return null;
  return n.toLocaleString();
}

export function RestaurantFeedCard({
  restaurant,
  isFavorite,
  favoriteLoading,
  onToggleFavorite,
  onPress,
}: Props) {
  const cover = restaurant.coverUrl || restaurant.imageUrl || restaurant.logoUrl;
  const price = restaurant.priceForTwo ?? restaurant.costForTwo;
  const rating =
    typeof restaurant.rating === 'number' && restaurant.rating > 0
      ? restaurant.rating
      : undefined;
  const isNew = restaurant.status === 'pending';
  const isClosed = restaurant.isOpen === false;
  const topCuisine = restaurant.cuisines?.[0] ?? 'Restaurant';
  const offerText = restaurant.offer || (isNew ? '15% off: NEW15' : null);
  const reviews = formatReviews(restaurant.reviewCount);

  return (
    <View style={styles.outer}>
      <View style={styles.shadowWrap}>
        <View style={styles.card}>
          <View style={styles.hero}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onPress}
              disabled={!onPress}
            />
            {cover ? (
              <Image
                source={{ uri: cover }}
                style={styles.heroImage}
                contentFit="cover"
                transition={200}
                pointerEvents="none"
              />
            ) : (
              <LinearGradient
                colors={['#2D2A26', '#1A1816']}
                style={styles.heroImage}
                pointerEvents="none"
              />
            )}

            {offerText ? (
              <View style={styles.offerBadge} pointerEvents="none">
                <Tag color="#FFFFFF" size={12} strokeWidth={2.4} />
                <Text style={styles.offerBadgeText} numberOfLines={1}>
                  {offerText}
                </Text>
              </View>
            ) : null}

            {onToggleFavorite ? (
              <FavoriteHeartButton
                active={!!isFavorite}
                disabled={favoriteLoading}
                onPress={() => onToggleFavorite(restaurant.id)}
                size={20}
                color="#FFFFFF"
                activeColor={authTheme.brand}
                style={styles.heartBtn}
              />
            ) : null}

            {isClosed ? (
              <View style={styles.closedScrim} pointerEvents="none">
                <View style={styles.closedPill}>
                  <Text style={styles.closedLabel}>Currently closed</Text>
                </View>
              </View>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.body, pressed && styles.pressed]}
            onPress={onPress}
            disabled={!onPress}
          >
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>
                {restaurant.name}
              </Text>
              {rating ? (
                <View style={styles.ratingRow}>
                  <Star color="#F5B041" fill="#F5B041" size={14} />
                  <Text style={styles.ratingText}>
                    {rating.toFixed(1)}
                    {reviews ? ` (${reviews})` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {priceLevel(price)} • {topCuisine}
              {restaurant.deliveryTime ? ` • ${restaurant.deliveryTime}` : ''}
              {restaurant.isPureVeg ? ' • Pure Veg' : ''}
              {isClosed ? ' • Closed' : ''}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 18,
  },
  shadowWrap: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  hero: {
    height: 176,
    backgroundColor: '#1A1816',
    overflow: 'hidden',
    width: '100%',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  offerBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    maxWidth: '72%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: authTheme.brand,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },
  offerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 36,
    height: 36,
  },
  closedScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedPill: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
  },
  closedLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1C',
    letterSpacing: -0.2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});
