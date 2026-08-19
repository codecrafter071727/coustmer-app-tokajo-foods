import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  ExploreRestaurantCard,
  ExploreRestaurantSkeleton,
} from '@/components/home/ExploreRestaurantCard';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import type { Restaurant } from '@/lib/restaurant/types';

type Props = {
  restaurants: Restaurant[];
  totalCount?: number;
  title?: string;
  favoriteIds?: string[];
  favoriteLoadingId?: string | null;
  onToggleFavorite?: (id: string) => void;
  onPressRestaurant?: (id: string) => void;
  loadingMore?: boolean;
  loading?: boolean;
};

export function PopularRestaurantsSection({
  restaurants,
  totalCount,
  title,
  favoriteIds = [],
  favoriteLoadingId = null,
  onToggleFavorite,
  onPressRestaurant,
  loadingMore,
  loading,
}: Props) {
  const count = totalCount ?? restaurants.length;
  const heading =
    title ??
    (count > 0
      ? `Top ${count} restaurants to explore`
      : 'Top restaurants to explore');

  return (
    <View style={styles.wrap}>
      {heading.trim() ? (
        <View style={styles.headingRow}>
          <View style={styles.headingLine} />
          <Text style={styles.title}>{heading.toUpperCase()}</Text>
          <View style={styles.headingLine} />
        </View>
      ) : null}

      {loading && restaurants.length === 0 ? (
        <View>
          <ExploreRestaurantSkeleton />
          <ExploreRestaurantSkeleton />
          <ExploreRestaurantSkeleton />
        </View>
      ) : (
        <View>
          {restaurants.map((item) => (
            <ExploreRestaurantCard
              key={item.id}
              restaurant={item}
              isFavorite={favoriteIds.includes(item.id)}
              favoriteLoading={favoriteLoadingId === item.id}
              onToggleFavorite={onToggleFavorite}
              onPress={
                onPressRestaurant ? () => onPressRestaurant(item.id) : undefined
              }
            />
          ))}
          {loadingMore ? (
            <View style={styles.moreWrap}>
              <ActivityIndicator color={authTheme.brand} />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 26,
    marginBottom: 8,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  headingLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EAEAEA',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 0.8,
  },
  moreWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
