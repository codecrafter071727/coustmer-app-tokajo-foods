import { Pressable } from '@/components/common/Pressable';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Heart, Clock, Star, Bike } from 'lucide-react-native';

import { HomeFiltersBar } from '@/components/home/HomeFiltersBar';
import { fonts } from '@/constants/typography';
import type { HomeFilterState } from '@/lib/home/filters';
import type { Restaurant } from '@/lib/restaurant/types';

type Props = {
  restaurants?: Restaurant[];
  allRestaurants?: Restaurant[];
  filters: HomeFilterState;
  onFiltersChange: (next: HomeFilterState) => void;
  onClearFilters: () => void;
};

export function CategoriesSection({
  restaurants = [],
  allRestaurants = [],
  filters,
  onFiltersChange,
  onClearFilters,
}: Props) {
  const router = useRouter();
  const list = restaurants;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        <Text style={styles.titleDark}>What's </Text>
        <Text style={styles.titleAccent}>your craving</Text>
        <Text style={styles.titleDark}> today?</Text>
      </Text>

      <HomeFiltersBar
        filters={filters}
        onChange={onFiltersChange}
        onClear={onClearFilters}
        allRestaurants={allRestaurants}
      />

      {list.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptyText}>
            Try another cuisine or clear filters to see more restaurants.
          </Text>
          <Pressable style={styles.emptyBtn} onPress={onClearFilters}>
            <Text style={styles.emptyBtnText}>Clear filters</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          {list.map((r) => {
            const imageUri = r.coverUrl || r.imageUrl || r.logoUrl;
            const rating =
              typeof r.rating === 'number' && r.rating > 0
                ? r.rating.toFixed(1)
                : '4.5';
            const time = r.deliveryTime || '25-30 min';
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: '#0B1220',
    paddingHorizontal: 16,
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  titleDark: {
    color: '#0B1220',
    fontFamily: fonts.displayBold,
  },
  titleAccent: {
    color: '#F97316',
    fontFamily: fonts.displayBold,
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
