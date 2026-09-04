import { StyleSheet, Text, View } from 'react-native';

import { HomeFiltersBar } from '@/components/home/HomeFiltersBar';
import { PopularRestaurantsSection } from '@/components/home/PopularRestaurantsSection';
import { fonts } from '@/constants/typography';
import type { HomeFilterState } from '@/lib/home/filters';
import type { HomeCategory } from '@/lib/home/types';
import type { CuisineChip, Restaurant } from '@/lib/restaurant/types';

type Props = {
  homeFilters: HomeFilterState;
  onFiltersChange: (next: HomeFilterState) => void;
  onClearFilters: () => void;
  baseRestaurants: Restaurant[];
  restaurants: Restaurant[];
  homeCategories: HomeCategory[];
  liveCuisines: CuisineChip[];
  favoriteIds: string[];
  surgeChipLabel?: string | null;
  onToggleFavorite: (id: string) => void;
  onPressRestaurant: (id: string) => void;
};

/** Filtered home body — results list without discovery rails. */
export function FilteredHomeResults({
  homeFilters,
  onFiltersChange,
  onClearFilters,
  baseRestaurants,
  restaurants,
  homeCategories,
  liveCuisines,
  favoriteIds,
  surgeChipLabel,
  onToggleFavorite,
  onPressRestaurant,
}: Props) {
  return (
    <View style={styles.wrap}>
      <HomeFiltersBar
        filters={homeFilters}
        onChange={onFiltersChange}
        onClear={onClearFilters}
        allRestaurants={baseRestaurants}
        categories={homeCategories}
        liveCuisines={liveCuisines}
        hideCuisineRow
      />
      <Text style={styles.title}>
        {restaurants.length > 0
          ? `${restaurants.length} restaurant${restaurants.length === 1 ? '' : 's'} found`
          : 'No restaurants found'}
      </Text>
      {restaurants.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Nothing matches these filters. Clear filters to see all restaurants.
          </Text>
          <Text style={styles.clear} onPress={onClearFilters}>
            Clear filters
          </Text>
        </View>
      ) : (
        <PopularRestaurantsSection
          title=""
          restaurants={restaurants}
          totalCount={restaurants.length}
          favoriteIds={favoriteIds}
          surgeChipLabel={surgeChipLabel}
          onToggleFavorite={onToggleFavorite}
          onPressRestaurant={onPressRestaurant}
          loadingMore={false}
          loading={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8, paddingBottom: 8 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: '#0B1220',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  empty: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  clear: {
    marginTop: 12,
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: '#F97316',
  },
});
