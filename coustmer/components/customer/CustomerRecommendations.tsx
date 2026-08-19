import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bike, Clock, Heart, Sparkles, Star } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts } from '@/constants/typography';
import { useRecommended } from '@/lib/customer/hooks';
import { useFavoriteToggle } from '@/lib/customer/useFavoriteToggle';
import type { RestaurantCard } from '@/lib/customer/types';

const ORANGE = '#F97316';
const INK = '#0B1220';
const FALLBACK_LIMIT = 10;

type FallbackRestaurant = {
  id: string;
  name?: string;
  imageUrl?: string;
  coverUrl?: string;
  logoUrl?: string;
  rating?: number;
  cuisines?: string[];
  deliveryTime?: string;
  deliveryFee?: string | number;
  costForTwo?: number;
  priceForTwo?: number;
  isOpen?: boolean;
};

type Props = {
  fallbackRestaurants?: FallbackRestaurant[];
  allowedRestaurantIds?: ReadonlySet<string>;
};

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toCard(r: FallbackRestaurant): RestaurantCard {
  return {
    id: String(r.id),
    name: r.name || 'Restaurant',
    imageUrl: r.imageUrl || r.coverUrl || r.logoUrl,
    coverUrl: r.coverUrl,
    logoUrl: r.logoUrl,
    rating: r.rating,
    cuisines: r.cuisines,
    deliveryTime: r.deliveryTime,
    deliveryFee: r.deliveryFee,
    costForTwo: r.costForTwo,
    priceForTwo: r.priceForTwo,
    isOpen: r.isOpen,
  };
}

export function CustomerRecommendations({
  fallbackRestaurants: _fallback = [],
  allowedRestaurantIds,
}: Props) {
  const router = useRouter();
  const recommended = useRecommended();
  const { isFavorite, toggleFavorite } = useFavoriteToggle();

  const items = useMemo(() => {
    return (recommended.data ?? []).filter(
      (restaurant) =>
        restaurant?.id &&
        (!allowedRestaurantIds ||
          allowedRestaurantIds.has(String(restaurant.id)))
    );
  }, [allowedRestaurantIds, recommended.data]);

  const isFromApi = items.length > 0;

  if (recommended.isLoading && !items.length) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={ORANGE} />
      </View>
    );
  }

  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles color={ORANGE} size={15} strokeWidth={2.4} />
        <Text style={styles.title}>Picked for you</Text>
        <Text style={styles.count}>{items.length}</Text>
      </View>
      {!isFromApi ? (
        <Text style={styles.hint}>Suggestions near you</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {items.map((item: RestaurantCard) => {
          const imageUri =
            item.coverUrl ||
            item.imageUrl ||
            (item.logoUrl as string | undefined);
          const rating =
            typeof item.rating === 'number' && item.rating > 0
              ? item.rating.toFixed(1)
              : '4.5';
          const time =
            (item.deliveryTime as string | undefined) || '25-30 min';
          const deliveryFee =
            typeof item.deliveryFee === 'string' ? item.deliveryFee : 'Free';
          const minOrderText = item.costForTwo
            ? `₹${item.costForTwo} for two`
            : item.priceForTwo
              ? `₹${item.priceForTwo} for two`
              : '₹200 for two';
          const isClosed = item.isOpen === false;
          const fav = isFavorite(String(item.id));

          return (
            <Pressable
              key={String(item.id)}
              style={styles.card}
              onPress={() => router.push(`/restaurants/${item.id}`)}
            >
              <View style={styles.cardImageWrap}>
                {imageUri ? (
                  <Image
                    source={{ uri: String(imageUri) }}
                    style={[styles.cardImage, isClosed && styles.cardImageDim]}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.cardImage, styles.imageFallback]}>
                    <Text style={styles.fallbackLetter}>
                      {(item.name || 'R').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {isClosed ? (
                  <View style={styles.closedScrim} pointerEvents="none">
                    <Text style={styles.closedScrimText}>Closed</Text>
                  </View>
                ) : null}
                <Pressable
                  style={styles.heartBtn}
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    toggleFavorite(String(item.id), { restaurant: item });
                  }}
                >
                  <Heart
                    color={fav ? ORANGE : '#374151'}
                    fill={fav ? ORANGE : 'transparent'}
                    size={18}
                    strokeWidth={2}
                  />
                </Pressable>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.ratingBadge}>
                    <Star color="#F59E0B" size={12} fill="#F59E0B" />
                    <Text style={styles.ratingText}>{rating}</Text>
                  </View>
                </View>

                <View style={styles.cardMetaRow}>
                  <Clock color="#64748B" size={12} strokeWidth={2.5} />
                  <Text style={styles.metaText}>{time}</Text>
                  <Bike color="#64748B" size={12} strokeWidth={2} />
                  <Text style={styles.metaText}>{String(deliveryFee)}</Text>
                </View>

                <Text style={styles.minOrder}>{minOrderText}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    marginBottom: 6,
  },
  loadingWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
    marginTop: 8,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: INK,
    letterSpacing: -0.35,
  },
  count: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  hint: {
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: -8,
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: '#94A3B8',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 14,
  },
  card: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardImageWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageDim: {
    opacity: 0.72,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLetter: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    color: ORANGE,
  },
  closedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedScrimText: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardInfo: {
    padding: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardName: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: INK,
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#1F2937',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  metaText: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: '#475569',
    marginRight: 4,
  },
  minOrder: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
