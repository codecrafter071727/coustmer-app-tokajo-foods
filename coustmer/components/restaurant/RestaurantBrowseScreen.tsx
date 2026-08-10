import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search, UtensilsCrossed, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator,
  FlatList,
  
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EmptyView, ErrorView } from '@/components/common/StateViews';
import { APP_BOTTOM_NAV_INSET } from '@/components/navigation/AppBottomNav';
import { RestaurantListCard } from '@/components/restaurant/RestaurantListCard';
import { authTheme } from '@/constants/auth-theme';
import {
  extractCityFromAddress,
  normalizeCityName,
} from '@/lib/location/format';
import {
  findCategoryBySlug,
  FOOD_CATEGORIES,
} from '@/lib/restaurant/categories';
import {
  useNearbyRestaurants,
  useRestaurants,
  useRestaurantsOfferingCategory,
} from '@/lib/restaurant/hooks';
import { homeFiltersToNearbyParams } from '@/lib/restaurant/nearby-params';
import { DEFAULT_HOME_FILTERS } from '@/lib/home/filters';
import type { Restaurant } from '@/lib/restaurant/types';
import {
  useDebouncedValue,
  useSearchRestaurants,
} from '@/lib/search/hooks';
import {
  useDeliveryCoords,
  useDeliveryLocationStore,
} from '@/store/delivery-location-store';
import { CategoryExploreScreen } from '@/components/restaurant/CategoryExploreScreen';

const BROWSE_CATEGORIES = FOOD_CATEGORIES.filter((c) => c.slug !== 'all');

export function RestaurantBrowseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string;
    cuisine?: string;
    label?: string;
    view?: string;
  }>();

  const [search, setSearch] = useState(params.q ?? '');
  const [selectedCuisine, setSelectedCuisine] = useState(
    params.cuisine && params.cuisine !== 'all' ? params.cuisine : ''
  );
  const deliveryLocation = useDeliveryLocationStore((s) => s.location);
  const coords = useDeliveryCoords();
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const city = useMemo(() => {
    const raw =
      deliveryLocation?.city ||
      (deliveryLocation?.formattedAddress
        ? extractCityFromAddress(deliveryLocation.formattedAddress)
        : null);
    return normalizeCityName(raw);
  }, [deliveryLocation]);

  const activeCategory = useMemo(() => {
    if (!selectedCuisine || selectedCuisine === 'all') return undefined;
    const known = findCategoryBySlug(selectedCuisine);
    if (known) return known;
    // Dynamic API category / cuisine slug from home
    const label = selectedCuisine
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      label,
      slug: selectedCuisine,
      icon: UtensilsCrossed,
      color: '#EA580C',
      imageUrl:
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=300&fit=crop&q=80',
    };
  }, [selectedCuisine]);
  const isCategoryMode = Boolean(selectedCuisine && selectedCuisine !== 'all');
  const isTextSearch = !isCategoryMode && debouncedSearch.length >= 2;
  const useNearby =
    !isCategoryMode &&
    !isTextSearch &&
    Boolean(coords?.lat && coords?.lng);

  useEffect(() => {
    if (params.q) setSearch(params.q);
  }, [params.q]);

  useEffect(() => {
    if (params.cuisine && params.cuisine !== 'all') {
      setSelectedCuisine(params.cuisine);
    }
  }, [params.cuisine]);

  const categoryQuery = useRestaurantsOfferingCategory({
    cuisine: selectedCuisine,
    city,
    enabled: isCategoryMode,
  });

  const searchQuery = useSearchRestaurants(
    {
      q: debouncedSearch,
      // Do not send lat/lng with text `q` — search-service rejects geoNear + text.
      sort: '-createdAt',
      limit: 40,
    },
    { enabled: isTextSearch }
  );

  const nearbyQuery = useNearbyRestaurants(
    useNearby && coords
      ? homeFiltersToNearbyParams(coords, DEFAULT_HOME_FILTERS, {
          radius: 20,
          limit: 50,
        })
      : null
  );

  const allQuery = useRestaurants({
    search: undefined,
    city: city || undefined,
    sort: '-createdAt',
    lat: coords?.lat,
    lng: coords?.lng,
  });

  const restaurants = useMemo((): Restaurant[] => {
    if (isCategoryMode) return categoryQuery.data?.restaurants ?? [];
    if (isTextSearch) {
      return (searchQuery.data?.restaurants ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        imageUrl: r.imageUrl,
        coverUrl: r.coverUrl,
        rating: r.rating,
        reviewCount: r.reviewCount,
        cuisines: r.cuisines,
        deliveryTime: r.deliveryTime,
        priceForTwo: r.priceForTwo,
        costForTwo: r.costForTwo,
        distance: r.distance,
        isOpen: r.isOpen,
        address: r.address,
        city: r.city,
        offer: r.offer,
        isPureVeg: r.isPureVeg,
        lat: r.lat,
        lng: r.lng,
      }));
    }
    if (useNearby && (nearbyQuery.data?.restaurants?.length ?? 0) > 0) {
      return nearbyQuery.data?.restaurants ?? [];
    }
    return allQuery.data?.restaurants ?? [];
  }, [
    isCategoryMode,
    isTextSearch,
    useNearby,
    categoryQuery.data?.restaurants,
    searchQuery.data?.restaurants,
    nearbyQuery.data?.restaurants,
    allQuery.data?.restaurants,
  ]);

  const filteredList = useMemo(() => {
    if (isTextSearch) return restaurants;
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.cuisines?.some((c) => c.toLowerCase().includes(q)) ||
        r.city?.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q)
    );
  }, [restaurants, search, isTextSearch]);

  const activeQuery = isCategoryMode
    ? categoryQuery
    : isTextSearch
      ? searchQuery
      : useNearby && (nearbyQuery.data?.restaurants?.length ?? 0) > 0
        ? nearbyQuery
        : allQuery;

  const resultCount = isCategoryMode
    ? (categoryQuery.data?.total ?? filteredList.length)
    : isTextSearch
      ? (searchQuery.data?.meta?.total ?? filteredList.length)
      : filteredList.length;

  const subtitle = useMemo(() => {
    if (activeQuery.isLoading && activeCategory) {
      return `Finding ${activeCategory.label} near you…`;
    }
    if (activeCategory) {
      if (city) {
        return `${resultCount} place${resultCount === 1 ? '' : 's'} with ${activeCategory.label} in ${city}`;
      }
      return `Restaurants serving ${activeCategory.label}`;
    }
    if (isTextSearch && debouncedSearch) {
      return `${resultCount} result${resultCount === 1 ? '' : 's'} for “${debouncedSearch}”`;
    }
    if (city) return `Discover food in ${city}`;
    return 'Discover food near you';
  }, [
    activeQuery.isLoading,
    activeCategory,
    city,
    resultCount,
    isTextSearch,
    debouncedSearch,
  ]);

  const openRestaurant = (id: string) => {
    router.push({
      pathname: '/restaurants/[restaurantId]',
      params: {
        restaurantId: id,
        ...(selectedCuisine ? { category: selectedCuisine } : {}),
      },
    });
  };

  const clearCuisine = () => setSelectedCuisine('');

  const listHeader = (
    <View style={{ paddingTop: 16 }}>
      {activeCategory ? (
        <LinearGradient
          colors={['#FFF1F0', '#FFE8E4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.filterBanner}
        >
          {activeCategory.imageUrl ? (
            <Image
              source={{ uri: activeCategory.imageUrl }}
              style={styles.filterThumb}
              contentFit="cover"
            />
          ) : null}
          <View style={styles.filterCopy}>
            <Text style={styles.filterTitle}>
              Showing {activeCategory.label}
            </Text>
            <Text style={styles.filterSub}>
              Open a restaurant to jump to this menu section
            </Text>
          </View>
          <Pressable
            onPress={clearCuisine}
            hitSlop={8}
            style={styles.clearChip}
            accessibilityLabel="Clear category filter"
          >
            <X color={authTheme.brand} size={14} strokeWidth={2.5} />
            <Text style={styles.clearChipText}>Clear</Text>
          </Pressable>
        </LinearGradient>
      ) : null}

      <View style={styles.searchBar}>
        <Search color={authTheme.brand} size={18} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={
            activeCategory
              ? `Search ${activeCategory.label.toLowerCase()} spots`
              : 'Search restaurants or cuisines'
          }
          placeholderTextColor={authTheme.textDim}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <X color={authTheme.textDim} size={16} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.categoryRail}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryRow}
        >
          <Pressable
            style={[
              styles.categoryChip,
              !selectedCuisine && styles.categoryChipActive,
            ]}
            onPress={clearCuisine}
          >
            <View
              style={[
                styles.categoryDot,
                !selectedCuisine && styles.categoryDotActive,
              ]}
            >
              <UtensilsCrossed
                color={!selectedCuisine ? '#FFFFFF' : authTheme.brand}
                size={12}
              />
            </View>
            <Text
              style={[
                styles.categoryChipText,
                !selectedCuisine && styles.categoryChipTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>

          {BROWSE_CATEGORIES.map((cat) => {
            const selected = selectedCuisine === cat.slug;
            return (
              <Pressable
                key={cat.slug}
                style={[
                  styles.categoryChip,
                  selected && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCuisine(cat.slug)}
              >
                <Image
                  source={{ uri: cat.imageUrl }}
                  style={styles.categoryThumb}
                  contentFit="cover"
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    selected && styles.categoryChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
          {activeCategory &&
          !BROWSE_CATEGORIES.some((c) => c.slug === activeCategory.slug) ? (
            <Pressable
              style={[styles.categoryChip, styles.categoryChipActive]}
              onPress={() => setSelectedCuisine(activeCategory.slug)}
            >
              {activeCategory.imageUrl ? (
                <Image
                  source={{ uri: activeCategory.imageUrl }}
                  style={styles.categoryThumb}
                  contentFit="cover"
                />
              ) : null}
              <Text
                style={[styles.categoryChipText, styles.categoryChipTextActive]}
                numberOfLines={1}
              >
                {activeCategory.label}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      {!activeQuery.isLoading && !activeQuery.isError && filteredList.length > 0 ? (
        <Text style={styles.resultCount}>
          {filteredList.length} restaurant
          {filteredList.length === 1 ? '' : 's'}
          {activeCategory ? ` for ${activeCategory.label}` : ''}
          {city ? ` in ${city}` : ''}
        </Text>
      ) : null}
    </View>
  );

  // Home category chips → dishes from all restaurants (no "Picked for you")
  if (
    params.view === 'dishes' &&
    params.cuisine &&
    params.cuisine !== 'all' &&
    params.cuisine !== 'popular'
  ) {
    return <CategoryExploreScreen />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={['#FFF8F6', authTheme.bg, authTheme.bg]}
        locations={[0, 0.22, 1]}
        style={styles.container}
      >
        <ScreenHeader
          title={activeCategory ? activeCategory.label : 'All restaurants'}
          subtitle={subtitle}
        />

        {activeQuery.isLoading ? (
          <View style={styles.flex}>
            {listHeader}
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={authTheme.brand} size="large" />
              <Text style={styles.loadingLabel}>
                {activeCategory
                  ? `Finding ${activeCategory.label} restaurants…`
                  : 'Finding restaurants…'}
              </Text>
            </View>
          </View>
        ) : activeQuery.isError ? (
          <View style={styles.flex}>
            {listHeader}
            <ErrorView
              message={
                activeQuery.error instanceof Error
                  ? activeQuery.error.message
                  : 'Failed to load'
              }
              onRetry={() => activeQuery.refetch()}
            />
          </View>
        ) : filteredList.length === 0 ? (
          <View style={styles.flex}>
            {listHeader}
            <EmptyView
              icon={<UtensilsCrossed color={authTheme.textDim} size={44} />}
              title={
                activeCategory
                  ? `No ${activeCategory.label} restaurants yet`
                  : 'No restaurants yet'
              }
              subtitle={
                activeCategory
                  ? `We're adding ${activeCategory.label.toLowerCase()} partners soon. Try another category or check back later.`
                  : 'Restaurants will appear here once partners join the platform.'
              }
            />
          </View>
        ) : (
          <FlatList
            data={filteredList}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ListHeaderComponent={listHeader}
            refreshControl={
              <RefreshControl
                refreshing={activeQuery.isRefetching}
                onRefresh={() => activeQuery.refetch()}
                tintColor={authTheme.brand}
              />
            }
            renderItem={({ item }) => (
              <RestaurantListCard
                restaurant={item}
                onPress={() => openRestaurant(item.id)}
              />
            )}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF8F6',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  flex: {
    flex: 1,
  },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 65, 0.14)',
    padding: 12,
    marginBottom: 14,
  },
  filterThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  filterCopy: {
    flex: 1,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: authTheme.text,
  },
  filterSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
    color: authTheme.textMuted,
    lineHeight: 16,
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 65, 0.18)',
  },
  clearChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: authTheme.brand,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: authTheme.card,
    borderWidth: 1.5,
    borderColor: authTheme.inputBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 12,
    shadowColor: '#AC0F45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: authTheme.text,
    paddingVertical: 0,
  },
  categoryRail: {
    height: 44,
    marginBottom: 12,
  },
  categoryScroll: {
    flexGrow: 0,
    height: 44,
  },
  categoryRow: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  categoryChip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: authTheme.card,
    borderWidth: 1.5,
    borderColor: authTheme.inputBorder,
  },
  categoryChipActive: {
    backgroundColor: authTheme.brand,
    borderColor: authTheme.brand,
  },
  categoryThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  categoryDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: authTheme.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDotActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  categoryChipText: {
    color: authTheme.text,
    fontWeight: '700',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '700',
    color: authTheme.textMuted,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  list: {
    paddingBottom: 28 + APP_BOTTOM_NAV_INSET,
  },
  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 48 + APP_BOTTOM_NAV_INSET,
  },
  loadingLabel: {
    color: authTheme.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
