import { Pressable } from '@/components/common/Pressable';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Heart, Clock, Star, Bike } from 'lucide-react-native';

import { HomeFiltersBar } from '@/components/home/HomeFiltersBar';
import { CustomerRecommendations } from '@/components/customer/CustomerRecommendations';
import { fonts } from '@/constants/typography';
import type { HomeFilterState } from '@/lib/home/filters';
import {
  restaurantEtaLabel,
  restaurantOfferBadges,
  restaurantStars,
} from '@/lib/restaurant/card-display';
import { useHomeCategories } from '@/lib/restaurant/hooks';
import type { CuisineChip, Restaurant } from '@/lib/restaurant/types';

type Props = {
  restaurants?: Restaurant[];
  allRestaurants?: Restaurant[];
  filters: HomeFilterState;
  onFiltersChange: (next: HomeFilterState) => void;
  onClearFilters: () => void;
  /** City restaurants used when recommended API is empty */
  fallbackRestaurants?: Restaurant[];
  liveCuisines?: CuisineChip[];
};

export function CategoriesSection({
  restaurants = [],
  allRestaurants = [],
  filters,
  onFiltersChange,
  onClearFilters,
  fallbackRestaurants = [],
  liveCuisines = [],
}: Props) {
  const router = useRouter();
  const list = restaurants;
  const categorySource =
    allRestaurants.length > 0 ? allRestaurants : fallbackRestaurants;
  const homeCategories = useHomeCategories(categorySource);

  return (
    <View style={styles.container}>
      <HomeFiltersBar
        filters={filters}
        onChange={onFiltersChange}
        onClear={onClearFilters}
        allRestaurants={allRestaurants}
        categories={homeCategories.data}
        liveCuisines={liveCuisines}
      />

      <CustomerRecommendations
        fallbackRestaurants={
          fallbackRestaurants.length ? fallbackRestaurants : allRestaurants
        }
      />

      {list.length === 0 ? null : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          {list.map((r) => {
            const imageUri = r.coverUrl || r.imageUrl || r.logoUrl;
            const stars = restaurantStars(r);
            const rating = stars ? stars.toFixed(1) : null;
            const time = restaurantEtaLabel(r);
            const badges = restaurantOfferBadges(r);
            const deliveryFee =
              typeof r.deliveryFee === 'string'
                ? r.deliveryFee
                : 'Free';
            const minOrderText = r.costForTwo
              ? `₹${r.costForTwo} for two`
              : r.priceForTwo
                ? `₹${r.priceForTwo} for two`
                : '₹200 for two';
            const isClosed = r.isOpen === false;

            return (
              <Pressable
                key={r.id}
                style={styles.card}
                onPress={() => router.push(`/restaurants/${r.id}`)}
              >
                <View style={styles.cardImageWrap}>
                  <Image
                    source={{ uri: imageUri }}
                    style={[styles.cardImage, isClosed && styles.cardImageDim]}
                    contentFit="cover"
                  />
                  {isClosed ? (
                    <View style={styles.closedScrim} pointerEvents="none">
                      <Text style={styles.closedScrimText}>Closed</Text>
                    </View>
                  ) : null}
                  <View style={styles.heartBtn}>
                    <Heart color="#374151" size={18} strokeWidth={2} />
                  </View>
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    {rating ? (
                      <View style={styles.ratingBadge}>
                        <Star color="#F59E0B" size={12} fill="#F59E0B" />
                        <Text style={styles.ratingText}>{rating}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardMetaRow}>
                    {time ? (
                      <>
                        <Clock color="#64748B" size={12} strokeWidth={2.5} />
                        <Text style={styles.metaText}>{time}</Text>
                      </>
                    ) : null}
                    <Bike color="#64748B" size={12} strokeWidth={2} />
                    <Text style={styles.metaText}>{String(deliveryFee)}</Text>
                  </View>
                  {badges[0] ? (
                    <Text style={styles.minOrder} numberOfLines={1}>
                      {badges[0]}
                    </Text>
                  ) : null}

                  <Text style={styles.minOrder}>{minOrderText}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  emptyBox: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: '#0B1220',
  },
  emptyText: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F97316',
  },
  emptyBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  cardsRow: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
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
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageDim: {
    opacity: 0.72,
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
    letterSpacing: 0.3,
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
    color: '#0B1220',
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
