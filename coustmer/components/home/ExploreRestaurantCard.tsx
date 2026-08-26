import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreVertical, Star, Zap, Percent } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { FavoriteHeartButton } from '@/components/common/FavoriteHeartButton';
import { VegMarkIcon } from '@/components/home/VegMarkIcon';
import {
  RestaurantClosedOverlay,
  RestaurantSurgeBadge,
} from '@/components/restaurant/RestaurantCardOverlays';
import { fonts } from '@/constants/typography';
import {
  restaurantClosedLabel,
  restaurantEtaLabel,
  restaurantIsClosed,
  restaurantOfferBadges,
  restaurantRatingCount,
  restaurantStars,
  formatDistanceKm,
} from '@/lib/restaurant/card-display';
import type { Restaurant } from '@/lib/restaurant/types';

type Props = {
  restaurant: Restaurant;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onToggleFavorite?: (id: string) => void;
  onPress?: () => void;
  surgeChipLabel?: string | null;
};

function offerOverlay(restaurant: Restaurant) {
  return restaurantOfferBadges(restaurant)[0] || null;
}

function formatReviews(n?: number) {
  if (!n || n <= 0) return null;
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K+`;
  }
  return String(n);
}

function areaLabel(restaurant: Restaurant) {
  const addr = restaurant.address?.trim();
  if (addr) {
    const part = addr.split(',')[0]?.trim();
    if (part) return part;
  }
  return restaurant.city?.trim() || null;
}

export function ExploreRestaurantCard({
  restaurant,
  isFavorite,
  favoriteLoading,
  onToggleFavorite,
  onPress,
  surgeChipLabel,
}: Props) {
  const cover = restaurant.coverUrl || restaurant.imageUrl || restaurant.logoUrl;
  const rating = restaurantStars(restaurant);
  const reviews = formatReviews(restaurantRatingCount(restaurant));
  const isClosed = restaurantIsClosed(restaurant);
  const closedCopy = restaurantClosedLabel(restaurant);
  const cuisines =
    (restaurant.cuisines ?? []).slice(0, 3).join(', ') || 'Restaurant';
  const time = restaurantEtaLabel(restaurant) || undefined;
  const offer = offerOverlay(restaurant);
  const area = areaLabel(restaurant);
  const distance = formatDistanceKm(restaurant.distance);

  const costText = restaurant.costForTwo
    ? `₹${restaurant.costForTwo} for two`
    : restaurant.priceForTwo
      ? `₹${restaurant.priceForTwo} for two`
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.shadowContainer}>
        <Pressable
          style={({ pressed }) => [styles.clipContainer, pressed && styles.pressed]}
          onPress={onPress}
          disabled={!onPress}
        >
          <View style={styles.imageWrap}>
            {cover ? (
              <Image
                source={{ uri: cover }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.image, styles.imageFallback]} />
            )}

            {surgeChipLabel ? (
              <RestaurantSurgeBadge label={surgeChipLabel} />
            ) : null}

            {offer ? (
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.offerGrad}
                pointerEvents="none"
              >
                <View style={styles.offerBadge}>
                  <View style={styles.offerIconWrap}>
                    <Percent color="#FFFFFF" size={10} strokeWidth={4} />
                  </View>
                  <Text style={styles.offerText} numberOfLines={1}>
                    {offer}
                  </Text>
                </View>
              </LinearGradient>
            ) : null}

            {time ? (
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>{time.toUpperCase()}</Text>
              </View>
            ) : null}

            {isClosed ? <RestaurantClosedOverlay restaurant={restaurant} /> : null}

            {/* Icons top right */}
            <View style={styles.topRightIcons}>
              {onToggleFavorite ? (
                <FavoriteHeartButton
                  active={!!isFavorite}
                  disabled={favoriteLoading}
                  onPress={() => onToggleFavorite(restaurant.id)}
                  size={22}
                  color="#FFFFFF"
                  activeColor="#E23744"
                  withBackdrop={false}
                />
              ) : null}
              <MoreVertical color="#FFFFFF" size={22} strokeWidth={2.5} style={{ marginLeft: 8 }} />
            </View>
          </View>

          <View style={styles.details}>
            <View style={styles.tagsRow}>


              {restaurant.isPureVeg && (
                <View style={styles.tagItem}>
                  <VegMarkIcon size={12} />
                  <Text style={styles.vegText}> Pure Veg</Text>
                </View>
              )}

              {/* Optional badge placeholder */}
              {typeof restaurant.badge === 'string' && (
                <View style={styles.tagItem}>
                  <Text style={styles.badgeText}>⭐ {restaurant.badge as string}</Text>
                </View>
              )}
            </View>

            <Text style={styles.name} numberOfLines={1}>
              {restaurant.name}
            </Text>

            <View style={styles.ratingRow}>
              {rating ? (
                <>
                  <View style={styles.ratingCircle}>
                    <Star color="#FFFFFF" fill="#FFFFFF" size={10} />
                  </View>
                  <Text style={styles.ratingNum}>
                    {rating.toFixed(1)}
                    {reviews ? ` (${reviews})` : ''}
                  </Text>
                  <Text style={styles.dot}>•</Text>
                </>
              ) : (
                <>
                  <Text style={styles.noRatings}>No ratings</Text>
                  {area || distance ? <Text style={styles.dot}>•</Text> : null}
                </>
              )}
              {area || distance ? (
                <Text style={styles.locationInfo} numberOfLines={1}>
                  {[area, distance].filter(Boolean).join(', ')}
                </Text>
              ) : null}
            </View>

            <Text style={styles.cuisine} numberOfLines={1}>
              {[cuisines, costText, isClosed && closedCopy ? closedCopy : null]
                .filter(Boolean)
                .join(' • ')}
            </Text>
            {restaurant.hoursToday ? (
              <Text style={styles.hoursToday} numberOfLines={1}>
                {restaurant.hoursToday}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export function ExploreRestaurantSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.shadowContainer}>
        <View style={styles.clipContainer}>
          <View style={[styles.imageWrap, styles.skelBlock]} />
          <View style={styles.details}>
            <View style={[styles.skelLine, { width: '40%', height: 12, marginBottom: 8 }]} />
            <View style={[styles.skelLine, { width: '80%', height: 20, marginBottom: 8 }]} />
            <View style={[styles.skelLine, { width: '60%', height: 14, marginBottom: 4 }]} />
            <View style={[styles.skelLine, { width: '50%', height: 14 }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  shadowContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    // iOS Shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    // Android Shadow
    elevation: 14,
  },
  clipContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  imageWrap: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    backgroundColor: '#E5E7EB',
  },
  offerGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    padding: 12,
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  offerIconWrap: {
    backgroundColor: '#F97316', // Orange accent
    borderRadius: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  topRightIcons: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
    transform: [{ translateY: 1 }], // Slight overlap hack
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  details: {
    padding: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boltTextBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  boltTextLight: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  vegText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F8A45',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706', // Yellowish
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  ratingCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  ratingNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  noRatings: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  dot: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    marginHorizontal: 6,
  },
  locationInfo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
  },
  cuisine: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  hoursToday: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  skelBlock: {
    backgroundColor: '#E5E7EB',
  },
  skelLine: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
});
