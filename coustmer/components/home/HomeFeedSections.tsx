import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AutoScrollingDeals } from '@/components/home/AutoScrollingDeals';
import { FilteredHomeResults } from '@/components/home/FilteredHomeResults';
import { HomeFiltersBar } from '@/components/home/HomeFiltersBar';
import { HomeRestaurantRail } from '@/components/home/HomeRestaurantRail';
import { PopularRestaurantsSection } from '@/components/home/PopularRestaurantsSection';
import { TrendingDishesRail } from '@/components/home/TrendingDishesRail';
import { WhatsOnYourMind } from '@/components/home/WhatsOnYourMind';
import { ErrorView } from '@/components/common/StateViews';
import { fonts } from '@/constants/typography';
import { CUSTOMER_DISCOVERY_RADIUS_KM } from '@/lib/location/discovery-radius';
import type { Deal, HomeFeed } from '@/lib/customer/types';
import type { HomeFilterState } from '@/lib/home/filters';
import { splitHomeRestaurantList } from '@/lib/home/split-list';
import type { HomeCategory } from '@/lib/home/types';
import type { CuisineChip, Restaurant } from '@/lib/restaurant/types';

type Props = {
  filtersActive: boolean;
  homeFilters: HomeFilterState;
  onFiltersChange: (next: HomeFilterState) => void;
  onClearFilters: () => void;
  baseRestaurants: Restaurant[];
  restaurants: Restaurant[];
  topRestaurants: Restaurant[];
  homeCategories: HomeCategory[];
  mindCategories?: CuisineChip[];
  mindCategoriesLoading?: boolean;
  liveCuisines?: CuisineChip[];
  deals: Deal[];
  feedRails?: HomeFeed | null;
  homeLoading: boolean;
  userLoggedIn: boolean;
  hasCoords: boolean;
  isDetectingLocation: boolean;
  favoriteIds: string[];
  surgeChipLabel?: string | null;
  onToggleFavorite: (id: string) => void;
  onPressRestaurant: (id: string) => void;
  feedError?: string | null;
  onRetryFeed?: () => void;
  loadingMore: boolean;
  listLoading: boolean;
  totalCount: number;
  radiusKm?: number;
};

/**
 * Swiggy / Zomato home:
 * trending → dishes → restaurants → order again → more → top rated → rest.
 */
export function HomeFeedSections(props: Props) {
  const {
    filtersActive,
    homeFilters,
    onFiltersChange,
    onClearFilters,
    baseRestaurants,
    restaurants,
    topRestaurants,
    homeCategories,
    mindCategories = [],
    mindCategoriesLoading = false,
    liveCuisines = [],
    deals,
    feedRails,
    homeLoading,
    userLoggedIn,
    hasCoords,
    isDetectingLocation,
    favoriteIds,
    surgeChipLabel,
    onToggleFavorite,
    onPressRestaurant,
    feedError,
    onRetryFeed,
    loadingMore,
    listLoading,
    totalCount,
    radiusKm,
  } = props;

  const router = useRouter();
  const chunks = useMemo(
    () => splitHomeRestaurantList(topRestaurants, 4, 4),
    [topRestaurants]
  );

  const openDish = (restaurantId: string) => {
    router.push({
      pathname: '/restaurants/[restaurantId]',
      params: { restaurantId },
    });
  };

  if (filtersActive) {
    return (
      <FilteredHomeResults
        homeFilters={homeFilters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
        baseRestaurants={baseRestaurants}
        restaurants={restaurants}
        homeCategories={homeCategories}
        liveCuisines={liveCuisines}
        favoriteIds={favoriteIds}
        surgeChipLabel={surgeChipLabel}
        onToggleFavorite={onToggleFavorite}
        onPressRestaurant={onPressRestaurant}
      />
    );
  }

  const listBusy = listLoading && topRestaurants.length === 0;
  const radiusLabel = radiusKm ?? CUSTOMER_DISCOVERY_RADIUS_KM;

  return (
    <View>
      <HomeFiltersBar
        filters={homeFilters}
        onChange={onFiltersChange}
        onClear={onClearFilters}
        allRestaurants={baseRestaurants}
        categories={homeCategories}
        liveCuisines={liveCuisines}
        hideCuisineRow
      />

      <WhatsOnYourMind
        categories={mindCategories}
        loading={mindCategoriesLoading}
      />

      {deals.length > 0 ? <AutoScrollingDeals deals={deals} /> : null}

      <HomeRestaurantRail
        variant="trending"
        title="Trending near you"
        subtitle="Most ordered right now"
        restaurants={feedRails?.trending ?? []}
        loading={homeLoading && !feedRails}
        onPressRestaurant={onPressRestaurant}
      />

      <TrendingDishesRail
        dishes={feedRails?.dishesToTry ?? []}
        loading={homeLoading && !feedRails}
        title="Dishes to try"
        subtitle="Popular picks near you"
        accent="discover"
        onPressDish={(dish) => openDish(dish.restaurantId)}
      />

      {chunks.first.length > 0 || listBusy ? (
        <PopularRestaurantsSection
          title="Restaurants near you"
          restaurants={chunks.first}
          totalCount={chunks.first.length}
          favoriteIds={favoriteIds}
          surgeChipLabel={surgeChipLabel}
          onToggleFavorite={onToggleFavorite}
          onPressRestaurant={onPressRestaurant}
          loadingMore={false}
          loading={listBusy}
        />
      ) : null}

      {userLoggedIn ? (
        <TrendingDishesRail
          dishes={feedRails?.orderAgain ?? []}
          loading={homeLoading && !feedRails}
          title="Order again"
          subtitle="Dishes you loved last time"
          accent="reorder"
          onPressDish={(dish) => openDish(dish.restaurantId)}
        />
      ) : null}

      {chunks.mid.length > 0 ? (
        <PopularRestaurantsSection
          title="More to explore"
          restaurants={chunks.mid}
          totalCount={chunks.mid.length}
          favoriteIds={favoriteIds}
          surgeChipLabel={surgeChipLabel}
          onToggleFavorite={onToggleFavorite}
          onPressRestaurant={onPressRestaurant}
          loadingMore={false}
          loading={false}
        />
      ) : null}

      <HomeRestaurantRail
        variant="top-rated"
        title="Top rated near you"
        subtitle="Highest rated kitchens"
        restaurants={feedRails?.topRated ?? []}
        loading={homeLoading && !feedRails}
        onPressRestaurant={onPressRestaurant}
      />

      {!hasCoords && !isDetectingLocation ? (
        <View style={styles.hintCard}>
          <Text style={styles.hintText}>
            Set your delivery location above to see restaurants in your area.
          </Text>
        </View>
      ) : null}

      {feedError ? (
        <View style={styles.errorWrap}>
          <ErrorView message={feedError} onRetry={onRetryFeed} />
        </View>
      ) : null}

      {chunks.rest.length > 0 || (listLoading && chunks.first.length > 0) ? (
        <PopularRestaurantsSection
          title={`All restaurants within ${radiusLabel} km`}
          restaurants={chunks.rest}
          totalCount={Math.max(
            0,
            totalCount - chunks.first.length - chunks.mid.length
          )}
          favoriteIds={favoriteIds}
          surgeChipLabel={surgeChipLabel}
          onToggleFavorite={onToggleFavorite}
          onPressRestaurant={onPressRestaurant}
          loadingMore={loadingMore}
          loading={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hintCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  hintText: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: '#EA580C',
    textAlign: 'center',
  },
  errorWrap: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});
