import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { SaveAddressLabelModal } from '@/components/address/SaveAddressLabelModal';
import { CategoriesSection } from '@/components/home/CategoriesSection';
import { CollectionRail } from '@/components/home/CollectionRail';
import { HomeFiltersBar } from '@/components/home/HomeFiltersBar';
import { NewlyAddedRail } from '@/components/home/NewlyAddedRail';
import { PopularRestaurantsSection } from '@/components/home/PopularRestaurantsSection';
import { OrderAgainSection } from '@/components/home/OrderAgainSection';

import { AutoScrollingDeals } from '@/components/home/AutoScrollingDeals';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { SwiggyHomeChrome } from '@/components/home/SwiggyHomeChrome';
import { VegModeModal } from '@/components/home/VegModeModal';
import { DeliveryLocationPicker } from '@/components/location/DeliveryLocationPicker';
import { InitialLocationSheet } from '@/components/location/InitialLocationSheet';
import { CustomerRecommendations } from '@/components/customer/CustomerRecommendations';
import { APP_BOTTOM_NAV_INSET } from '@/components/navigation/AppBottomNav';
import { CartFloatingBar } from '@/components/order/CartFloatingBar';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import { useQueryClient } from '@tanstack/react-query';
import { addressApi } from '@/lib/address/api';
import { formatAddressLabel } from '@/lib/address/types';
import {
  useAppConfig,
  useCollections,
  useCustomerProfile,
  useDeals,
  useHomeFeed,
  useOffersFeed,
} from '@/lib/customer/hooks';
import { useFavoriteToggle } from '@/lib/customer/useFavoriteToggle';
import {
  applyHomeFilters,
  countActiveHomeFilters,
  DEFAULT_HOME_FILTERS,
  type HomeFilterState,
} from '@/lib/home/filters';
import {
  deliveryHeaderSubtitle,
  deliveryHeaderTitle,
  extractCityFromAddress,
  isCoordinateFallbackAddress,
  normalizeCityName,
  restaurantMatchesCity,
} from '@/lib/location/format';
import { resolvePlaceFromCoords } from '@/lib/location/resolve-place';
import { useDeliveryLocationInit } from '@/lib/location/use-delivery-location-init';
import { parseDeliveryAddress } from '@/lib/order/parse-address';
import {
  useHomeCategories,
  useInfiniteRestaurants,
  useNearbyRestaurants,
  useRestaurantCuisines,
} from '@/lib/restaurant/hooks';
import { homeFiltersToNearbyParams } from '@/lib/restaurant/nearby-params';
import { useAuthStore } from '@/store/auth-store';
import {
  useDeliveryCoords,
  useDeliveryLocationStore,
} from '@/store/delivery-location-store';
import {
  type VegMode,
  useVegPreferenceStore,
} from '@/store/veg-preference-store';

const HOME_BG = '#FFFFFF';
const ORANGE = '#F97316';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [vegModalOpen, setVegModalOpen] = useState(false);
  const [hasPromptedLocation, setHasPromptedLocation] = useState(false);
  const [homeFilters, setHomeFilters] =
    useState<HomeFilterState>(DEFAULT_HOME_FILTERS);
  const [mindPinned, setMindPinned] = useState(false);
  const [savePrompt, setSavePrompt] = useState<{
    label: string;
    formattedAddress: string;
    city?: string;
    lat: number;
    lng: number;
    source: 'gps' | 'search';
  } | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  const vegMode = useVegPreferenceStore((s) => s.mode);
  const setVegMode = useVegPreferenceStore((s) => s.setMode);

  const scrollY = useSharedValue(0);
  /** Y offset in the list where mind *items* begin (title already above this). */
  const pinAt = useSharedValue(0);

  useDeliveryLocationInit();

  const deliveryLocation = useDeliveryLocationStore((s) => s.location);
  const isDetectingLocation = useDeliveryLocationStore((s) => s.isDetecting);
  const setDeliveryLocation = useDeliveryLocationStore((s) => s.setLocation);
  const coords = useDeliveryCoords();
  const qc = useQueryClient();

  // When delivery location changes, wipe stale restaurant caches immediately
  // so the user never sees restaurants from the previous city/coords.
  useEffect(() => {
    qc.removeQueries({ queryKey: ['restaurant'] });
  }, [coords?.lat, coords?.lng, qc]);

  const city = useMemo(() => {
    const raw =
      deliveryLocation?.city ||
      (deliveryLocation?.formattedAddress
        ? extractCityFromAddress(deliveryLocation.formattedAddress)
        : null) ||
      null;
    return normalizeCityName(raw);
  }, [deliveryLocation]);

  const deliveryTitle = useMemo(() => {
    if (!deliveryLocation) return 'Set delivery address';
    if (
      isCoordinateFallbackAddress(deliveryLocation.formattedAddress) ||
      isCoordinateFallbackAddress(deliveryLocation.label)
    ) {
      return isDetectingLocation ? 'Detecting your location…' : 'Current location';
    }
    return deliveryHeaderTitle(
      deliveryLocation.label,
      deliveryLocation.formattedAddress
    );
  }, [deliveryLocation, isDetectingLocation]);

  const deliverySubtitle = useMemo(() => {
    if (!deliveryLocation) return '';
    if (
      isCoordinateFallbackAddress(deliveryLocation.formattedAddress) ||
      isCoordinateFallbackAddress(deliveryLocation.label)
    ) {
      return '';
    }
    return deliveryHeaderSubtitle(
      deliveryTitle,
      deliveryLocation.formattedAddress
    );
  }, [deliveryLocation, deliveryTitle]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _config = useAppConfig(); // fetch config on home-mount (splash already rendered)
  const home = useHomeFeed();
  const deals = useDeals();
  const offers = useOffersFeed();
  const collections = useCollections();
  const profile = useCustomerProfile();
  const { favoriteIds, toggleFavorite } = useFavoriteToggle();

  const greeting =
    user?.firstName?.trim() || user?.email?.split('@')[0] || 'foodie';

  const feed = useInfiniteRestaurants(
    {
      city: city || undefined,
      sort: 'newest',
      limit: 12,
      lat: coords?.lat,
      lng: coords?.lng,
    },
    { enabled: Boolean(city) }
  );

  const nearbyParams = useMemo(
    () =>
      coords?.lat && coords?.lng
        ? homeFiltersToNearbyParams(
            { lat: coords.lat, lng: coords.lng },
            homeFilters,
            { radius: 15, limit: 40 }
          )
        : null,
    [coords?.lat, coords?.lng, homeFilters]
  );
  const nearby = useNearbyRestaurants(nearbyParams);
  const liveCuisines = useRestaurantCuisines();
  const nearbyRestaurantIds = useMemo(
    () => new Set((nearby.data?.restaurants ?? []).map((restaurant) => restaurant.id)),
    [nearby.data?.restaurants]
  );

  const baseRestaurants = useMemo(() => {
    const nearbyRows = nearby.data?.restaurants ?? [];

    // Coordinates are authoritative. An empty nearby response means there are no
    // deliverable restaurants; never fall back to a city-wide/global listing.
    if (nearbyParams) {
      return nearbyRows;
    }

    // ── Fallback: city-string feed (no GPS / nearby still loading) ────────────
    const rows = feed.data?.pages.flatMap((p) => p.restaurants) ?? [];

    if (!city) return [];

    // Filter strictly by city. Never fall back to "show all" — that's what
    // caused Greater Noida restaurants to appear when a different city is chosen.
    const matched = rows.filter((r) => restaurantMatchesCity(r, city));
    return matched;
  }, [feed.data?.pages, nearby.data?.restaurants, nearbyParams, city]);

  const restaurants = useMemo(
    () =>
      applyHomeFilters(baseRestaurants, homeFilters, {
        skipServerSide: Boolean(
          nearbyParams && (nearby.data?.restaurants?.length ?? 0) > 0
        ),
      }),
    [baseRestaurants, homeFilters, nearbyParams, nearby.data?.restaurants]
  );

  const homeCategories = useHomeCategories(baseRestaurants);



  /** Top rail: highest rated first (different order than feed / deals) */
  const topRestaurants = useMemo(() => {
    return [...restaurants].sort((a, b) => {
      const ar = typeof a.rating === 'number' ? a.rating : 0;
      const br = typeof b.rating === 'number' ? b.rating : 0;
      if (br !== ar) return br - ar;
      const ac = a.reviewCount ?? 0;
      const bc = b.reviewCount ?? 0;
      if (bc !== ac) return bc - ac;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [restaurants]);

  const openRestaurant = (id: string) => {
    router.push({
      pathname: '/restaurants/[restaurantId]',
      params: { restaurantId: id },
    });
  };

  const refreshing =
    feed.isRefetching ||
    nearby.isRefetching ||
    home.isRefetching ||
    deals.isRefetching ||
    offers.isRefetching ||
    collections.isRefetching ||
    liveCuisines.isRefetching;

  const onRefresh = () => {
    feed.refetch();
    nearby.refetch();
    home.refetch();
    deals.refetch();
    offers.refetch();
    profile.refetch();
    collections.refetch();
    liveCuisines.refetch();
  };

  const onVegApply = (mode: VegMode) => {
    setVegMode(mode);
    setHomeFilters((prev) => ({
      ...prev,
      pureVeg: mode === 'pure_veg',
    }));
  };

  const onFiltersChange = (next: HomeFilterState) => {
    setHomeFilters(next);
    if (next.pureVeg && vegMode !== 'pure_veg') {
      setVegMode('pure_veg');
    } else if (!next.pureVeg && vegMode === 'pure_veg') {
      setVegMode('all');
    }
  };

  const onClearFilters = () => {
    setHomeFilters(DEFAULT_HOME_FILTERS);
    if (vegMode === 'pure_veg') setVegMode('all');
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useAnimatedReaction(
    () => scrollY.value >= 120,
    (isPinned, prev) => {
      if (isPinned !== prev) {
        runOnJS(setMindPinned)(!!isPinned);
      }
    }
  );

  const pinOverlayStyle = useAnimatedStyle(() => {
    const show = scrollY.value >= 120;
    return { opacity: show ? 1 : 0 };
  });

  const inlineMindStyle = useAnimatedStyle(() => {
    const show = !(pinAt.value > 0 && scrollY.value >= pinAt.value - insets.top);
    return { opacity: show ? 1 : 0 };
  });

  useEffect(() => {
    return () => setMindPinned(false);
  }, []);

  const onConfirmLocation = async (result: {
    lat: number;
    lng: number;
    formattedAddress: string;
    label: string;
    source: 'gps' | 'search' | 'saved';
    savedAddressId?: string;
  }) => {
    setPickerOpen(false);
    setHasPromptedLocation(true);

    if (result.source === 'saved') {
      setDeliveryLocation({
        label: result.label,
        formattedAddress: result.formattedAddress,
        city: normalizeCityName(
          extractCityFromAddress(result.formattedAddress)
        ),
        lat: result.lat,
        lng: result.lng,
        source: 'saved',
        savedAddressId: result.savedAddressId,
        updatedAt: Date.now(),
      });
      return;
    }

    const applyLocal = (loc: {
      label: string;
      formattedAddress: string;
      city?: string;
      lat: number;
      lng: number;
      source: 'gps' | 'search';
    }) => {
      const next: {
        label: string;
        formattedAddress: string;
        city?: string;
        lat: number;
        lng: number;
        source: 'gps' | 'search';
      } = {
        label: loc.label,
        formattedAddress: loc.formattedAddress,
        lat: loc.lat,
        lng: loc.lng,
        source: loc.source,
      };
      const cityName = normalizeCityName(loc.city);
      if (cityName) next.city = cityName;
      setDeliveryLocation({
        ...next,
        savedAddressId: undefined,
        updatedAt: Date.now(),
      });
      return next;
    };

    let applied: {
      label: string;
      formattedAddress: string;
      city?: string;
      lat: number;
      lng: number;
      source: 'gps' | 'search';
    } = {
      label: result.label,
      formattedAddress: result.formattedAddress,
      lat: result.lat,
      lng: result.lng,
      source: result.source,
    };
    const initialCity = normalizeCityName(
      extractCityFromAddress(result.formattedAddress)
    );
    if (initialCity) applied.city = initialCity;

    // Apply immediately so UI updates instantly without waiting for reverse geocoding
    applyLocal(applied);

    try {
      const resolved = await resolvePlaceFromCoords({
        lat: result.lat,
        lng: result.lng,
        source: result.source,
        preferredAddress: result.formattedAddress,
      });
      applied = applyLocal({
        label: resolved.label || result.label,
        formattedAddress: resolved.formattedAddress,
        city: normalizeCityName(resolved.city),
        lat: resolved.lat,
        lng: resolved.lng,
        source: result.source,
      });
    } catch {
      applied = applyLocal(applied);
    }

    if (!user) return;
    setSavePrompt(applied);
  };

  const closeSavePrompt = () => {
    if (savingAddress) return;
    setSavePrompt(null);
  };

  const onSaveAddressWithLabel = (payload: {
    label: 'home' | 'work' | 'other';
    displayLabel: string;
  }) => {
    if (!savePrompt || savingAddress) return;
    const applied = savePrompt;
    const parsed = parseDeliveryAddress({
      formattedAddress: applied.formattedAddress,
      label: payload.displayLabel,
      city: applied.city,
      lat: applied.lat,
      lng: applied.lng,
    });

    setSavingAddress(true);
    void addressApi
      .create({
        label: payload.label,
        formattedAddress: applied.formattedAddress,
        street: parsed.street,
        area: parsed.area,
        city: parsed.city,
        state: parsed.state,
        pincode: parsed.pincode,
        lat: applied.lat,
        lng: applied.lng,
        setAsDefault: true,
      })
      .then((saved) => {
        setDeliveryLocation({
          label:
            payload.displayLabel ||
            formatAddressLabel(saved.label) ||
            'Home',
          formattedAddress:
            saved.formattedAddress || applied.formattedAddress,
          city: normalizeCityName(
            saved.city ||
            extractCityFromAddress(
              saved.formattedAddress || applied.formattedAddress
            )
          ),
          lat: saved.lat || applied.lat,
          lng: saved.lng || applied.lng,
          source: 'saved',
          savedAddressId: saved.id,
          updatedAt: Date.now(),
        });
        setSavePrompt(null);
      })
      .catch((e) => {
        Alert.alert(
          'Could not save',
          e instanceof Error ? e.message : 'Try again from Profile'
        );
      })
      .finally(() => {
        setSavingAddress(false);
      });
  };

  const locationPicker = (
    <DeliveryLocationPicker
      visible={pickerOpen}
      initial={coords}
      autoDetectOnOpen
      onClose={() => setPickerOpen(false)}
      onConfirm={onConfirmLocation}
    />
  );

  const showInitialSheet =
    !deliveryLocation &&
    !hasPromptedLocation &&
    !isDetectingLocation &&
    !pickerOpen;

  const initialSheet = (
    <InitialLocationSheet
      visible={showInitialSheet}
      onManual={() => setPickerOpen(true)}
      onClose={() => setHasPromptedLocation(true)}
    />
  );

  const saveLabelModal = (
    <SaveAddressLabelModal
      visible={Boolean(savePrompt)}
      addressPreview={savePrompt?.formattedAddress}
      saving={savingAddress}
      onClose={closeSavePrompt}
      onSave={onSaveAddressWithLabel}
    />
  );

  const chrome = (
    <SwiggyHomeChrome
      topInset={insets.top}
      greeting={greeting}
      deliveryTitle={deliveryTitle}
      deliverySubtitle={deliverySubtitle}
      isDetectingLocation={isDetectingLocation}
      onLocationPress={() => setPickerOpen(true)}
      vegActive={vegMode === 'pure_veg' || homeFilters.pureVeg}
      onVegPress={() => setVegModalOpen(true)}
      banners={offers.data?.banners ?? home.data?.banners}
      deals={offers.data?.deals ?? deals.data}
    />
  );

  const filtersActive = countActiveHomeFilters(homeFilters) > 0;

  /**
   * Title scrolls away with content above.
   * Only the mind *items* pin when they reach the top (shrunk overlay).
   */
  const listHeader = (
    <View>
      {/* Hero chrome — measure its height for sticky pinning */}
      <View
        onLayout={(e) => {
          pinAt.value = e.nativeEvent.layout.height;
        }}
      >
        {chrome}
      </View>

      {/* Promo banners — prefer offers if non-empty, fall back to home feed banners */}
      {(() => {
        const offerBanners = offers.data?.banners;
        const homeBanners = home.data?.banners ?? [];
        const activeBanners = (offerBanners && offerBanners.length > 0) ? offerBanners : homeBanners;
        return activeBanners.length > 0 ? <BannerCarousel banners={activeBanners} /> : null;
      })()}

      {/* Deals carousel from API */}
      {(offers.data?.deals ?? deals.data ?? []).length > 0 && (
        <AutoScrollingDeals deals={offers.data?.deals ?? deals.data ?? []} />
      )}

      {filtersActive ? (
        <>
          <View style={styles.filteredWrap}>
            <HomeFiltersBar
              filters={homeFilters}
              onChange={onFiltersChange}
              onClear={onClearFilters}
              allRestaurants={baseRestaurants}
              categories={homeCategories.data}
              liveCuisines={liveCuisines.data}
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
                onToggleFavorite={(id) => {
                  const r = restaurants.find((x) => x.id === id);
                  toggleFavorite(id, r ? { restaurant: r } : undefined);
                }}
                onPressRestaurant={openRestaurant}
                loadingMore={false}
                loading={false}
              />
            )}
          </View>
        </>
      ) : (
        <>
          <View style={{ marginTop: 16 }}>
            <CategoriesSection
              restaurants={[]}
              filters={homeFilters}
              onFiltersChange={onFiltersChange}
              onClearFilters={onClearFilters}
              allRestaurants={baseRestaurants}
              fallbackRestaurants={restaurants}
              liveCuisines={liveCuisines.data}
            />
          </View>

          {(collections.data?.length ?? 0) > 0 && (
            <CollectionRail collections={collections.data!} />
          )}

          {(() => {
            type HRC = import('@/lib/home/types').HomeRestaurantCard;
            const newlyAdded = (home.data?.newlyAdded as unknown as HRC[] | undefined)
              ?.filter((restaurant) => nearbyRestaurantIds.has(restaurant.id));
            const trending = (home.data?.trending as unknown as HRC[] | undefined)
              ?.filter((restaurant) => nearbyRestaurantIds.has(restaurant.id));
            const useNewlyAdded = (newlyAdded?.length ?? 0) > 0;
            const useTrending = !useNewlyAdded && (trending?.length ?? 0) > 0;
            const railData = useNewlyAdded ? newlyAdded! : useTrending ? trending! : null;
            if (!railData) return null;
            return (
              <NewlyAddedRail
                restaurants={railData}
                onPressRestaurant={openRestaurant}
                loading={false}
                title={useNewlyAdded ? 'Newly added' : 'Trending near you'}
                subtitle={useNewlyAdded ? 'Fresh partners joining near you' : 'Most popular restaurants right now'}
              />
            );
          })()}

          {!city && !isDetectingLocation ? (
            <View style={[styles.paddedBlock, styles.hintCard]}>
              <Text style={styles.hintText}>
                Set your delivery location above to see restaurants in your city.
              </Text>
            </View>
          ) : null}

          {feed.isError ? (
            <View style={[styles.paddedBlock, styles.errorWrap]}>
              <ErrorView
                message={
                  feed.error instanceof Error
                    ? feed.error.message
                    : 'Could not load restaurants'
                }
                onRetry={() => feed.refetch()}
              />
            </View>
          ) : null}

          <OrderAgainSection allowedRestaurantIds={nearbyRestaurantIds} />

          <CustomerRecommendations
            fallbackRestaurants={restaurants}
            allowedRestaurantIds={nearbyRestaurantIds}
          />

          {topRestaurants.length > 0 || (feed.isLoading && !!city) ? (
            <PopularRestaurantsSection
              restaurants={topRestaurants}
              totalCount={
                feed.data?.pages?.[0]?.meta?.total ?? topRestaurants.length
              }
              favoriteIds={favoriteIds}
              onToggleFavorite={(id) => {
                const r = restaurants.find((x) => x.id === id);
                toggleFavorite(id, r ? { restaurant: r } : undefined);
              }}
              onPressRestaurant={openRestaurant}
              loadingMore={feed.isFetchingNextPage}
              loading={feed.isLoading && topRestaurants.length === 0}
            />
          ) : null}
        </>
      )}
    </View>
  );

  if (feed.isLoading && restaurants.length === 0 && city) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        {chrome}
        <LoadingView label="Finding restaurants near you…" />
        {locationPicker}
        {initialSheet}
        {saveLabelModal}
        <VegModeModal
          visible={vegModalOpen}
          onClose={() => setVegModalOpen(false)}
          onApply={onVegApply}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <Animated.FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) {
            feed.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 28 + APP_BOTTOM_NAV_INSET,
          flexGrow: 1,
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !filtersActive &&
          !feed.isLoading &&
          restaurants.length === 0 &&
          !!city ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {`No restaurants in ${city} yet`}
              </Text>
              <Text style={styles.emptyText}>
                Partners in your city will appear here once they register. Pull
                to refresh.
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={authTheme.brand}
            progressViewOffset={insets.top}
          />
        }
        renderItem={() => null}
      />



      {/* Sticky category strip only (filters scroll away) */}
      <Animated.View
        style={[
          styles.pinOverlay,
          { paddingTop: insets.top, paddingBottom: 0 },
          pinOverlayStyle,
        ]}
        pointerEvents={mindPinned ? 'auto' : 'none'}
      >
        <HomeFiltersBar
          compact
          categoriesOnly
          filters={homeFilters}
          onChange={onFiltersChange}
          onClear={onClearFilters}
          allRestaurants={baseRestaurants}
          categories={homeCategories.data}
          style={{ paddingTop: 4 }}
        />
      </Animated.View>

      {locationPicker}
      {initialSheet}
      {saveLabelModal}
      <VegModeModal
        visible={vegModalOpen}
        onClose={() => setVegModalOpen(false)}
        onApply={onVegApply}
      />

      <CartFloatingBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  paddedBlock: {
    paddingHorizontal: 18,
  },
  hintCard: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: authTheme.brandSoft,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: authTheme.brandMuted,
  },
  hintText: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: authTheme.brand,
    textAlign: 'center',
  },
  errorWrap: {
    marginBottom: 8,
  },
  emptyCard: {
    marginTop: 8,
    marginHorizontal: 16,
    padding: 28,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: authTheme.text,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: authTheme.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  sectionHead: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 16,
    letterSpacing: -0.3,
  },
  sectionHeadDark: {
    color: '#1C1C1C',
    fontFamily: fonts.displayBold,
  },
  sectionHeadAccent: {
    color: '#EA580C',
    fontFamily: fonts.displayBold,
  },
  hotDealsHead: {
    marginBottom: 14,
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
