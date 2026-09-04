import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AutoScrollingDeals } from '@/components/home/AutoScrollingDeals';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { HomeFiltersBar } from '@/components/home/HomeFiltersBar';
import { HomeRestaurantRail } from '@/components/home/HomeRestaurantRail';
import { PopularRestaurantsSection } from '@/components/home/PopularRestaurantsSection';
import { TrendingDishesRail } from '@/components/home/TrendingDishesRail';
import { WhatsOnYourMind } from '@/components/home/WhatsOnYourMind';
import { ErrorView } from '@/components/common/StateViews';
import { fonts } from '@/constants/typography';
import { CUSTOMER_DISCOVERY_RADIUS_KM } from '@/lib/location/discovery-radius';
import type { Deal, HomeBanner, HomeFeed } from '@/lib/customer/types';
import type { HomeFilterState } from '@/lib/home/filters';
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
  liveCuisines?: CuisineChip[];
  banners: HomeBanner[];
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
 * Swiggy / Zomato-style home body:
 * filters → what's on your mind → promos → curated rails → all restaurants.
 */
export function HomeFeedSections({
  filtersActive,
  homeFilters,
  onFiltersChange,
  onClearFilters,
  baseRestaurants,
  restaurants,
  topRestaurants,
  homeCategories,
  liveCuisines = [],
  banners,
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
}: Props) {
  const router = useRouter();

  if (filtersActive) {
    return (
      <View style={styles.filteredWrap}>
        <HomeFiltersBar
          filters={homeFilters}
          onChange={onFiltersChange}
          onClear={onClearFilters}
          allRestaurants={baseRestaurants}
          categories={homeCategories}
          liveCuisines={liveCuisines}
        />
        <Text style={styles.filteredTitle}>
          {restaurants.length > 0
            ? `${restaurants.length} restaurant${restaurants.length === 1 ? '' : 's'} found`
            : 'No restaurants found'}
        </Text>
        {restaurants.length === 0 ? (
          <View style={styles.filteredEmpty}>
            <Text style={styles.filteredEmptyText}>
              Nothing matches these filters. Clear filters to see all restaurants.
            </Text>
            <Text style={styles.filteredClear} onPress={onClearFilters}>
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

  return (
    <View>
      <HomeFiltersBar
        filters={homeFilters}
        onChange={onFiltersChange}
        onClear={onClearFilters}
        allRestaurants={baseRestaurants}
        categories={homeCategories}
        liveCuisines={liveCuisines}
      />

      <WhatsOnYourMind categories={homeCategories} />

      {banners.length > 0 ? <BannerCarousel banners={banners} /> : null}

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
        onPressDish={(dish) =>
          router.push({
            pathname: '/restaurants/[restaurantId]',
            params: { restaurantId: dish.restaurantId },
          })
        }
      />

      {userLoggedIn ? (
        <HomeRestaurantRail
          variant="order-again"
          title="Order again"
          subtitle="Your recent favourites"
          restaurants={feedRails?.orderAgain ?? []}
          loading={homeLoading && !feedRails}
          onPressRestaurant={onPressRestaurant}
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

      {topRestaurants.length > 0 || listLoading ? (
        <PopularRestaurantsSection
          title={
            radiusKm
              ? `All restaurants within ${radiusKm} km`
              : `All restaurants within ${CUSTOMER_DISCOVERY_RADIUS_KM} km`
          }
          restaurants={topRestaurants}
          totalCount={totalCount}
          favoriteIds={favoriteIds}
          surgeChipLabel={surgeChipLabel}
          onToggleFavorite={onToggleFavorite}
          onPressRestaurant={onPressRestaurant}
          loadingMore={loadingMore}
          loading={listLoading}
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
  filteredWrap: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  filteredTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: '#0B1220',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  filteredEmpty: {
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
  filteredEmptyText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  filteredClear: {
    marginTop: 12,
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: '#F97316',
  },
});
