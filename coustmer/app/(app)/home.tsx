import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingView } from '@/components/common/StateViews';
import { SaveAddressLabelModal } from '@/components/address/SaveAddressLabelModal';
import { HomeFeedSections } from '@/components/home/HomeFeedSections';
import { SwiggyHomeChrome } from '@/components/home/SwiggyHomeChrome';
import { VegModeModal } from '@/components/home/VegModeModal';
import { DeliveryLocationPicker } from '@/components/location/DeliveryLocationPicker';
import { InitialLocationSheet } from '@/components/location/InitialLocationSheet';
import { APP_BOTTOM_NAV_INSET } from '@/components/navigation/AppBottomNav';
import { CartFloatingBar } from '@/components/order/CartFloatingBar';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import { useQueryClient } from '@tanstack/react-query';
import { addressApi } from '@/lib/address/api';
import { formatAddressLabel } from '@/lib/address/types';
import type { HomeBanner } from '@/lib/customer/types';
import { CUSTOMER_DISCOVERY_RADIUS_KM } from '@/lib/location/discovery-radius';
import {
  useAppConfig,
  useCustomerProfile,
  useDeals,
  useHomeFeed,
  useOffersFeed,
} from '@/lib/customer/hooks';
import { useFavoriteToggle } from '@/lib/customer/useFavoriteToggle';
import { useActiveZoneSurge } from '@/lib/delivery/use-active-zone-surge';
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
  useNearbyMindCategories,
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
import type { Restaurant } from '@/lib/restaurant/types';

function dedupeRestaurants(rows: Restaurant[]): Restaurant[] {
  const seen = new Set<string>();
  const out: Restaurant[] = [];
  for (const row of rows) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

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

  useDeliveryLocationInit();

  const deliveryLocation = useDeliveryLocationStore((s) => s.location);
  const isDetectingLocation = useDeliveryLocationStore((s) => s.isDetecting);
  const setDeliveryLocation = useDeliveryLocationStore((s) => s.setLocation);
  const coords = useDeliveryCoords();
  const qc = useQueryClient();

  // When delivery location changes, wipe stale discovery caches immediately
  // so the user never sees restaurants from the previous pin.
  useEffect(() => {
    qc.removeQueries({ queryKey: ['restaurant'] });
    qc.removeQueries({ queryKey: ['customer', 'home'] });
    qc.removeQueries({ queryKey: ['customer', 'deals'] });
    qc.removeQueries({ queryKey: ['customer', 'offers'] });
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
      hygiene: homeFilters.hygieneRatedOnly || undefined,
      offers: homeFilters.offersOnly || undefined,
      veg: homeFilters.pureVeg || undefined,
    },
    { enabled: Boolean(city) }
  );

  const nearbyParams = useMemo(
    () =>
      coords?.lat && coords?.lng
        ? homeFiltersToNearbyParams(
            { lat: coords.lat, lng: coords.lng },
            homeFilters,
            { radius: CUSTOMER_DISCOVERY_RADIUS_KM, limit: 40 }
          )
        : null,
    [coords?.lat, coords?.lng, homeFilters]
  );
  const nearby = useNearbyRestaurants(nearbyParams);
  const liveCuisines = useRestaurantCuisines();
  const mindCategories = useNearbyMindCategories(coords, {
    radiusKm: CUSTOMER_DISCOVERY_RADIUS_KM,
    restaurantLimit: 40,
  });
  const { chipLabel: surgeChipLabel } = useActiveZoneSurge();

  const feedRails = home.data;

  const baseRestaurants = useMemo(() => {
    const nearbyRows = nearby.data?.restaurants ?? [];

    // Coordinates are authoritative. An empty nearby response means there are no
    // deliverable restaurants; never fall back to a city-wide/global listing.
    if (nearbyParams) {
      return dedupeRestaurants(nearbyRows);
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

  const mindCategoriesForHome = useMemo(() => {
    // API already returns unique menu categories from nearby restaurants
    // (not cuisine tags). Trust the server list as-is.
    return mindCategories.data?.categories ?? [];
  }, [mindCategories.data?.categories]);

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
    liveCuisines.isRefetching ||
    mindCategories.isRefetching;

  const onRefresh = () => {
    feed.refetch();
    nearby.refetch();
    home.refetch();
    deals.refetch();
    offers.refetch();
    profile.refetch();
    liveCuisines.refetch();
    mindCategories.refetch();
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

  const offerBanners: HomeBanner[] = Array.isArray(offers.data?.banners)
    ? offers.data.banners
    : [];
  const feedBanners: HomeBanner[] = Array.isArray(home.data?.banners)
    ? home.data.banners
    : [];
  const chromeBanners =
    offerBanners.length > 0 ? offerBanners : feedBanners;

  const chrome = (
    <SwiggyHomeChrome
      topInset={insets.top}
      greeting={greeting}
      deliveryTitle={deliveryTitle}
      deliverySubtitle={deliverySubtitle}
      isDetectingLocation={isDetectingLocation}
      onLocationPress={() => setPickerOpen(true)}
      banners={chromeBanners}
    />
  );

  const filtersActive = countActiveHomeFilters(homeFilters) > 0;
  const activeDeals = offers.data?.deals ?? deals.data ?? [];

  /**
   * Title scrolls away with content above.
   * Only the mind *items* pin when they reach the top (shrunk overlay).
   */
  const listHeader = (
    <View>
      {chrome}

      <HomeFeedSections
        filtersActive={filtersActive}
        homeFilters={homeFilters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
        baseRestaurants={baseRestaurants}
        restaurants={restaurants}
        topRestaurants={topRestaurants}
        homeCategories={homeCategories.data ?? []}
        mindCategories={mindCategoriesForHome}
        mindCategoriesLoading={mindCategories.isLoading}
        liveCuisines={liveCuisines.data}
        deals={activeDeals}
        feedRails={feedRails}
        homeLoading={home.isLoading}
        userLoggedIn={Boolean(user)}
        hasCoords={Boolean(coords)}
        isDetectingLocation={isDetectingLocation}
        favoriteIds={favoriteIds}
        surgeChipLabel={surgeChipLabel}
        onToggleFavorite={(id) => {
          const r = restaurants.find((x) => x.id === id);
          toggleFavorite(id, r ? { restaurant: r } : undefined);
        }}
        onPressRestaurant={openRestaurant}
        feedError={
          feed.isError
            ? feed.error instanceof Error
              ? feed.error.message
              : 'Could not load restaurants'
            : null
        }
        onRetryFeed={() => feed.refetch()}
        loadingMore={nearbyParams ? false : feed.isFetchingNextPage}
        listLoading={
          nearbyParams
            ? nearby.isLoading && topRestaurants.length === 0
            : feed.isLoading && topRestaurants.length === 0
        }
        totalCount={
          nearbyParams
            ? topRestaurants.length
            : (feed.data?.pages?.[0]?.meta?.total ?? topRestaurants.length)
        }
        radiusKm={feedRails?.radiusKm}
      />
    </View>
  );

  const discoveryLoading =
    restaurants.length === 0 &&
    (nearbyParams
      ? nearby.isLoading || nearby.isFetching || home.isLoading
      : Boolean(city) && feed.isLoading);

  if (discoveryLoading) {
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

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        onEndReached={() => {
          if (nearbyParams) return;
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
          restaurants.length === 0 &&
          (nearbyParams
            ? !nearby.isLoading && !nearby.isFetching
            : !feed.isLoading && !!city) ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {nearbyParams
                  ? 'We’re not servicing this area yet'
                  : `No restaurants in ${city} yet`}
              </Text>
              <Text style={styles.emptyText}>
                {nearbyParams
                  ? `No restaurants within ${CUSTOMER_DISCOVERY_RADIUS_KM} km of your delivery location. Try a different address.`
                  : 'Partners in your city will appear here once they register. Pull to refresh.'}
              </Text>
              {nearbyParams ? (
                <Text
                  style={styles.emptyCta}
                  onPress={() => setPickerOpen(true)}
                >
                  Change delivery address
                </Text>
              ) : null}
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
  emptyCta: {
    marginTop: 14,
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: ORANGE,
    textAlign: 'center',
  },
});
