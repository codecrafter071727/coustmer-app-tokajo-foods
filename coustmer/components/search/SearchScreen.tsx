import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronDown,
  Mic,
  Star,
  X,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator,
  Keyboard,
  Platform,
  
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SmoothPressable } from '@/components/common/SmoothPressable';
import { FavoriteHeartButton } from '@/components/common/FavoriteHeartButton';
import { VegMarkIcon } from '@/components/home/VegMarkIcon';
import { VegModeModal } from '@/components/home/VegModeModal';
import { MulticolorVarietyChip } from '@/components/search/MulticolorVarietyChip';
import { authTheme } from '@/constants/auth-theme';
import { useFavoriteToggle } from '@/lib/customer/useFavoriteToggle';
import { fonts } from '@/constants/typography';
import {
  useDebouncedValue,
  usePrefetchSearchCatalog,
  useSearchCombined,
  useSearchRestaurants,
  useSearchSuggestions,
} from '@/lib/search/hooks';
import {
  loadLocalRecentSearches,
  pushLocalRecentSearch,
} from '@/lib/search/recent';
import type {
  SearchDish,
  SearchRestaurant,
  SearchSuggestion,
} from '@/lib/search/types';
import { expandSearchQuery } from '@/lib/search/expandQuery';
import { getVarietiesForQuery } from '@/lib/search/varieties';
import { useDeliveryCoords } from '@/store/delivery-location-store';
import { useVegPreferenceStore } from '@/store/veg-preference-store';

const PLACEHOLDERS = [
  "Try 'Pizza'",
  "Try 'Biryani'",
  "Try 'Burger'",
  "Try 'EatRight'",
  "Try 'Momos'",
];

const VEG_GREEN = '#0F8A45';
const RATING_GREEN = '#1BA672';

const FILTERS = [
  { id: 'sort', label: 'Sort by', chevron: true },
  { id: 'store99', label: '99 store' },
  { id: 'bolt', label: 'Bolt', bolt: true, trailing: '15 mins' },
  { id: 'pure_veg', label: 'Pure Veg' },
] as const;

function formatReviews(n?: number) {
  if (!n || n <= 0) return null;
  if (n >= 1000) {
    const k = n / 1000;
    return `(${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K+)`;
  }
  return `(${n})`;
}

function areaFromRestaurant(r: SearchRestaurant) {
  if (r.address) {
    const part = r.address.split(',')[0]?.trim();
    if (part) return part.toUpperCase();
  }
  return r.city?.trim()?.toUpperCase() || null;
}

function offerFor(r: SearchRestaurant, index: number) {
  if (r.offer?.trim()) return r.offer.trim().toUpperCase();
  const offers = [
    '70% OFF UPTO ₹140',
    'GET 40% OFF',
    '50% OFF UPTO ₹100',
    'ITEMS AT ₹99',
    'FLAT ₹125 OFF',
  ];
  return offers[index % offers.length];
}

function cuisineLine(r: SearchRestaurant) {
  const list = (r.cuisines ?? []).slice(0, 3).join(', ');
  if (r.isOpen === false) {
    return list ? `Closed • ${list}` : 'Closed';
  }
  return list || 'Restaurant';
}

// Cycling string hook instead of absolute view
export function useCyclingPlaceholder() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);
  return PLACEHOLDERS[index];
}

function VegMiniToggle({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  return (
    <SmoothPressable
      style={styles.vegBtn}
      onPress={onPress}
      accessibilityLabel="Vegetarian filter"
      pressScale={0.94}
    >
      <View style={styles.vegStack}>
        <VegMarkIcon size={13} />
        <View style={[styles.vegSwitch, active && styles.vegSwitchOn]}>
          <View style={[styles.vegKnob, active && styles.vegKnobOn]} />
        </View>
      </View>
    </SmoothPressable>
  );
}

export function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const inputRef = useRef<TextInput>(null);

  const initialQ = typeof params.q === 'string' ? params.q : '';
  const [query, setQuery] = useState(initialQ);
  const [tab, setTab] = useState<'restaurants' | 'dishes'>('restaurants');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeVariety, setActiveVariety] = useState<string | null>(null);
  const [vegModalOpen, setVegModalOpen] = useState(false);

  const vegMode = useVegPreferenceStore((s) => s.mode);
  const setVegMode = useVegPreferenceStore((s) => s.setMode);
  const vegActive = vegMode === 'pure_veg';
  const { isFavorite, toggleFavorite } = useFavoriteToggle();
  const coords = useDeliveryCoords();

  const debounced = useDebouncedValue(query.trim(), 220);
  /** "piz" → "Pizza" so live typing (no Enter) opens the full dish results UI. */
  const searchQ = useMemo(() => expandSearchQuery(debounced), [debounced]);
  usePrefetchSearchCatalog();

  useEffect(() => {
    if (typeof params.q === 'string') setQuery(params.q);
  }, [params.q]);

  useEffect(() => {
    setActiveVariety(null);
  }, [searchQ]);

  /** Soft-complete "piz" → "Pizza" in the field so results match the reference UI without Enter. */
  useEffect(() => {
    if (debounced.length < 3) return;
    if (searchQ === debounced) return;
    if (!searchQ.toLowerCase().startsWith(debounced.toLowerCase())) return;
    // Only complete known dish labels, not free-form restaurant names
    if (searchQ.includes(' ')) return;
    setQuery(searchQ);
  }, [debounced, searchQ]);

  useEffect(() => {
    void loadLocalRecentSearches();
    const timer = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(timer);
  }, []);

  const combined = useSearchCombined(
    {
      q: searchQ,
      limit: 30,
      veg: vegActive || undefined,
      // Passed for future geo ranking; API strips lat/lng whenever `q` is set
      // (backend rejects text + geoNear in one query).
      lat: coords?.lat,
      lng: coords?.lng,
    },
    { enabled: searchQ.length >= 1 }
  );

  /** Direct restaurant-service name search — guarantees "Saurabh" etc. show up. */
  const restaurantSearch = useSearchRestaurants(
    { q: searchQ, limit: 30 },
    { enabled: searchQ.length >= 1 }
  );

  const suggestionsQuery = useSearchSuggestions(
    { q: debounced, limit: 8 },
    { enabled: debounced.length >= 1 && searchQ.length >= 1 }
  );

  const remember = useCallback(async (term: string) => {
    await pushLocalRecentSearch(term);
  }, []);

  const applySuggestion = useCallback(
    (item: SearchSuggestion) => {
      const text = item.text.trim();
      if (!text) return;

      if (item.type === 'restaurant' && item.restaurantId) {
        void remember(text);
        Keyboard.dismiss();
        router.push({
          pathname: '/restaurants/[restaurantId]',
          params: { restaurantId: item.restaurantId },
        });
        return;
      }

      if (item.type === 'dish' && item.restaurantId) {
        void remember(text);
        Keyboard.dismiss();
        router.push({
          pathname: '/restaurants/[restaurantId]',
          params: {
            restaurantId: item.restaurantId,
            ...(item.dishId ? { itemId: item.dishId } : {}),
            itemName: text,
          },
        });
        return;
      }

      setQuery(text);
      void remember(text);
    },
    [remember, router]
  );

  const openRestaurant = (id: string, name?: string) => {
    if (!id) return;
    void remember(name || query.trim());
    Keyboard.dismiss();
    router.push({
      pathname: '/restaurants/[restaurantId]',
      params: { restaurantId: id },
    });
  };

  const openDish = (dish: SearchDish) => {
    if (!dish.restaurantId) return;
    void remember(dish.name);
    Keyboard.dismiss();
    router.push({
      pathname: '/restaurants/[restaurantId]',
      params: {
        restaurantId: dish.restaurantId,
        ...(dish.id ? { itemId: dish.id } : {}),
        itemName: dish.name,
      },
    });
  };

  const varieties = useMemo(
    () => (searchQ.length >= 2 ? getVarietiesForQuery(searchQ) : []),
    [searchQ]
  );

  const restaurantsRaw = useMemo(() => {
    const fromRestaurants = restaurantSearch.data?.restaurants ?? [];
    const fromCombined = combined.data?.restaurants ?? [];
    if (!fromRestaurants.length) return fromCombined;
    if (!fromCombined.length) return fromRestaurants;
    const map = new Map<string, SearchRestaurant>();
    for (const r of [...fromRestaurants, ...fromCombined]) {
      if (r?.id && !map.has(r.id)) map.set(r.id, r);
    }
    return Array.from(map.values());
  }, [restaurantSearch.data?.restaurants, combined.data?.restaurants]);

  const dishesRaw = combined.data?.dishes ?? [];

  const cyclingPlaceholderText = useCyclingPlaceholder();

  const restaurants = useMemo(() => {
    let list = restaurantsRaw;
    if (vegActive || activeFilter === 'pure_veg') {
      // Keep unknown pure-veg status; only drop known non-veg.
      list = list.filter((r) => r.isPureVeg !== false);
    }
    if (activeVariety) {
      const v = varieties.find((x) => x.id === activeVariety)?.label.toLowerCase();
      if (v) {
        list = list.filter((r) => {
          const hay = [
            r.name,
            r.description,
            ...(r.cuisines ?? []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return (
            hay.includes(v) ||
            hay.includes(searchQ.toLowerCase()) ||
            hay.includes(debounced.toLowerCase())
          );
        });
        // If variety filter empties the list, keep original matches for the dish
        if (list.length === 0) list = restaurantsRaw;
      }
    }
    return list;
  }, [
    restaurantsRaw,
    vegActive,
    activeFilter,
    activeVariety,
    varieties,
    searchQ,
    debounced,
  ]);

  const dishes = useMemo(() => {
    let list = dishesRaw;
    if (vegActive || activeFilter === 'pure_veg') {
      list = list.filter((d) => d.isVeg !== false);
    }
    if (activeVariety) {
      const v = varieties.find((x) => x.id === activeVariety)?.label.toLowerCase();
      if (v) {
        const filtered = list.filter((d) =>
          d.name.toLowerCase().includes(v)
        );
        if (filtered.length > 0) list = filtered;
      }
    }
    return list;
  }, [dishesRaw, vegActive, activeFilter, activeVariety, varieties]);

  const featured = restaurants.slice(0, 5);
  const showResults = query.trim().length > 0;
  const suggestions = suggestionsQuery.data?.suggestions ?? [];
  const isLoading =
    (combined.isFetching || restaurantSearch.isFetching) &&
    restaurantsRaw.length === 0 &&
    dishesRaw.length === 0;
  const showError =
    combined.isError &&
    restaurantSearch.isError &&
    !isLoading &&
    restaurantsRaw.length === 0 &&
    dishesRaw.length === 0;

  const goBack = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  const panelY = useSharedValue(-120);
  const panelOpacity = useSharedValue(0);
  const pillY = useSharedValue(28);
  const pillOpacity = useSharedValue(0);

  useEffect(() => {
    panelY.value = withSpring(0, { damping: 20, stiffness: 140, mass: 0.85 });
    panelOpacity.value = withTiming(1, { duration: 220 });
    pillY.value = withSpring(0, { damping: 18, stiffness: 160, mass: 0.7 });
    pillOpacity.value = withTiming(1, { duration: 280 });
  }, [panelY, panelOpacity, pillY, pillOpacity]);

  const panelAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelY.value }],
    opacity: panelOpacity.value,
  }));



  const pillAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pillY.value }],
    opacity: pillOpacity.value,
  }));

  const searchField = (
    <Animated.View style={[styles.searchPill, showResults && { flex: 1 }, pillAnimStyle]}>
      <View style={styles.inputWrap}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={query.length === 0 ? cyclingPlaceholderText : ''}
          placeholderTextColor="#9CA3AF"
          selectionColor={authTheme.brand}
          cursorColor={authTheme.brand}
          underlineColorAndroid="transparent"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          onSubmitEditing={() => {
            if (query.trim()) void remember(query.trim());
          }}
        />
      </View>

      {query.length > 0 ? (
        <SmoothPressable
          onPress={() => setQuery('')}
          hitSlop={8}
          style={styles.clearBtn}
          pressScale={0.88}
          accessibilityLabel="Clear"
        >
          <X color="#9CA3AF" size={18} strokeWidth={2.2} />
        </SmoothPressable>
      ) : null}

      <View style={styles.micDivider} />
      <SmoothPressable
        hitSlop={8}
        style={styles.micBtn}
        pressScale={0.9}
        accessibilityLabel="Voice search"
      >
        <Mic color={authTheme.brand} size={20} strokeWidth={2.2} />
      </SmoothPressable>
    </Animated.View>
  );

  return (
    <View style={[styles.root, showResults && styles.rootSolid]}>
      {!showResults ? (
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={goBack} />
        </View>
      ) : null}

      <View style={styles.safe} pointerEvents="box-none">
        {showResults ? (
          <View style={[styles.resultsChrome, { paddingTop: Math.max(insets.top, 4) }]}>
            <View style={styles.titleRowResults}>
              <SmoothPressable
                onPress={goBack}
                style={styles.backBtn}
                hitSlop={10}
                pressScale={0.9}
                accessibilityLabel="Go back"
              >
                <ArrowLeft color="#3E4152" size={22} strokeWidth={2.2} />
              </SmoothPressable>
              <Pressable style={styles.showingWrap} onPress={() => { }}>
                <Text style={styles.showingText}>
                  Showing results in{' '}
                  <Text style={styles.showingFood}>Food</Text>
                </Text>
                <ChevronDown color={authTheme.brand} size={16} strokeWidth={2.6} />
              </Pressable>
              <View style={styles.backBtn} />
            </View>

            <View style={styles.searchRow}>
              {searchField}
              <VegMiniToggle
                active={vegActive}
                onPress={() => setVegModalOpen(true)}
              />
            </View>

            <View style={styles.tabsRow}>
              <Pressable
                style={styles.tabBtn}
                onPress={() => setTab('restaurants')}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    tab === 'restaurants' && styles.tabLabelOn,
                  ]}
                >
                  Restaurants
                </Text>
                {tab === 'restaurants' ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
              <Pressable style={styles.tabBtn} onPress={() => setTab('dishes')}>
                <Text
                  style={[styles.tabLabel, tab === 'dishes' && styles.tabLabelOn]}
                >
                  Dishes
                </Text>
                {tab === 'dishes' ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
            </View>
          </View>
        ) : (
          <Animated.View style={[styles.curvedPanel, { paddingTop: Math.max(insets.top, 24) }, panelAnimStyle]}>
            <View style={styles.titleRow}>
              <SmoothPressable
                onPress={goBack}
                style={styles.backBtn}
                hitSlop={10}
                pressScale={0.9}
                accessibilityLabel="Go back"
              >
                <ArrowLeft color="#686B78" size={22} strokeWidth={2.2} />
              </SmoothPressable>
              <Text style={styles.headerTitle}>Search for dishes & restaurants</Text>
              <View style={styles.backBtn} />
            </View>
            {searchField}
          </Animated.View>
        )}

        {showResults ? (
          <View style={styles.resultsSheet}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: insets.bottom + 40,
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {FILTERS.map((f) => {
                  const on =
                    activeFilter === f.id ||
                    (f.id === 'pure_veg' && vegActive);
                  return (
                    <Pressable
                      key={f.id}
                      style={[styles.filterChip, on && styles.filterChipOn]}
                      onPress={() => {
                        if (f.id === 'pure_veg') {
                          setVegMode(vegActive ? 'all' : 'pure_veg');
                          setActiveFilter(vegActive ? null : 'pure_veg');
                          return;
                        }
                        setActiveFilter((prev) => (prev === f.id ? null : f.id));
                      }}
                    >
                      <Text style={[styles.filterText, on && styles.filterTextOn]}>
                        {f.label}
                      </Text>
                      {'bolt' in f && f.bolt ? (
                        <Zap
                          color={authTheme.brand}
                          size={12}
                          fill={authTheme.brand}
                        />
                      ) : null}
                      {'trailing' in f && f.trailing ? (
                        <Text
                          style={[styles.filterText, on && styles.filterTextOn]}
                        >
                          {f.trailing}
                        </Text>
                      ) : null}
                      {'chevron' in f && f.chevron ? (
                        <ChevronDown color="#686B78" size={14} strokeWidth={2.4} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {varieties.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.varietyRow}
                >
                  {varieties.map((v) => (
                    <MulticolorVarietyChip
                      key={v.id}
                      label={v.label}
                      selected={activeVariety === v.id}
                      onPress={() =>
                        setActiveVariety((prev) => (prev === v.id ? null : v.id))
                      }
                    />
                  ))}
                </ScrollView>
              ) : null}

              {suggestions.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {suggestions.map((s) => (
                    <Pressable
                      key={s.id}
                      style={styles.suggestionChip}
                      onPress={() => applySuggestion(s)}
                    >
                      <Text style={styles.suggestionText} numberOfLines={1}>
                        {s.text}
                      </Text>
                      {s.type && s.type !== 'query' ? (
                        <Text style={styles.suggestionType}>
                          {s.type === 'restaurant'
                            ? 'Restaurant'
                            : s.type === 'dish'
                              ? 'Dish'
                              : s.type === 'cuisine'
                                ? 'Cuisine'
                                : ''}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              {isLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={authTheme.brand} />
                </View>
              ) : null}

              {showError ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>Search is unavailable</Text>
                  <Text style={styles.emptySub}>
                    Check your connection and try again
                  </Text>
                  <Pressable
                    style={styles.retryBtn}
                    onPress={() => {
                      void combined.refetch();
                      void restaurantSearch.refetch();
                    }}
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}

              {tab === 'restaurants' ? (
                <>
                  {featured.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.featuredRow}
                      decelerationRate="fast"
                      snapToInterval={268}
                    >
                      {featured.map((r, i) => (
                        <Animated.View
                          key={`feat-${r.id}`}
                          entering={FadeInDown.delay(Math.min(i * 50, 200)).duration(
                            280
                          )}
                        >
                          <FeaturedCard
                            restaurant={r}
                            index={i}
                            onPress={() => openRestaurant(r.id, r.name)}
                          />
                        </Animated.View>
                      ))}
                    </ScrollView>
                  ) : null}

                  {restaurants.map((restaurant, i) => (
                    <Animated.View
                      key={restaurant.id}
                      entering={FadeInDown.delay(Math.min(i * 35, 180)).duration(
                        240
                      )}
                    >
                      <RestaurantResultCard
                        restaurant={restaurant}
                        index={i}
                        isFavorite={isFavorite(restaurant.id)}
                        onToggleFavorite={() =>
                          toggleFavorite(restaurant.id, {
                            restaurant: {
                              id: restaurant.id,
                              name: restaurant.name,
                              imageUrl:
                                restaurant.imageUrl || restaurant.coverUrl,
                              rating: restaurant.rating,
                              cuisines: restaurant.cuisines,
                              deliveryTime: restaurant.deliveryTime,
                            },
                          })
                        }
                        onPress={() =>
                          openRestaurant(restaurant.id, restaurant.name)
                        }
                      />
                    </Animated.View>
                  ))}

                  {!isLoading && restaurants.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyTitle}>
                        No restaurants for &quot;{searchQ}&quot;
                      </Text>
                      <Text style={styles.emptySub}>
                        Try another dish or restaurant name
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  {dishes.map((dish, i) => (
                    <Animated.View
                      key={dish.id}
                      entering={FadeInDown.delay(Math.min(i * 35, 180)).duration(
                        240
                      )}
                    >
                      <DishResultRow
                        dish={dish}
                        onPress={() => openDish(dish)}
                      />
                    </Animated.View>
                  ))}
                  {!isLoading && dishes.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyTitle}>
                        No dishes for &quot;{searchQ}&quot;
                      </Text>
                      <Text style={styles.emptySub}>
                        Try another search term
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <VegModeModal
        visible={vegModalOpen}
        onClose={() => setVegModalOpen(false)}
        onApply={(mode) => {
          setVegMode(mode);
          setVegModalOpen(false);
        }}
      />
    </View>
  );
}

function FeaturedCard({
  restaurant,
  index,
  onPress,
}: {
  restaurant: SearchRestaurant;
  index: number;
  onPress: () => void;
}) {
  const cover = restaurant.coverUrl || restaurant.imageUrl;
  const rating =
    typeof restaurant.rating === 'number' && restaurant.rating > 0
      ? restaurant.rating.toFixed(1)
      : null;
  const time = restaurant.deliveryTime || '30-40 mins';
  const offer = offerFor(restaurant, index);

  return (
    <SmoothPressable style={styles.featuredCard} onPress={onPress} pressScale={0.98}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.featuredImage} contentFit="cover" />
      ) : (
        <View style={[styles.featuredImage, styles.imageFallback]} />
      )}
      <View style={styles.featuredOfferBadge}>
        <Text style={styles.featuredOfferText} numberOfLines={1}>
          {offer.replace(/UPTO.*/, '').trim() || offer}
        </Text>
      </View>
      <View style={styles.adBadge}>
        <Text style={styles.adText}>AD</Text>
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.78)']}
        style={styles.featuredGrad}
      >
        <Text style={styles.featuredName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.featuredMeta}>
          {rating ? (
            <>
              <Star color="#1BA672" fill="#1BA672" size={12} />
              <Text style={styles.featuredMetaText}>{rating}</Text>
              <Text style={styles.featuredDot}>•</Text>
            </>
          ) : null}
          <Text style={styles.featuredMetaText}>{time}</Text>
        </View>
      </LinearGradient>
    </SmoothPressable>
  );
}

function RestaurantResultCard({
  restaurant,
  index,
  onPress,
  isFavorite,
  onToggleFavorite,
}: {
  restaurant: SearchRestaurant;
  index: number;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const cover = restaurant.coverUrl || restaurant.imageUrl;
  const rating =
    typeof restaurant.rating === 'number' && restaurant.rating > 0
      ? restaurant.rating.toFixed(1)
      : null;
  const reviews = formatReviews(restaurant.reviewCount);
  const time = restaurant.deliveryTime || '30-35 mins';
  const area = areaFromRestaurant(restaurant);
  const distance =
    typeof restaurant.distance === 'number' && restaurant.distance > 0
      ? `${restaurant.distance.toFixed(1)} km`
      : null;
  const offer = offerFor(restaurant, index + 2);
  const cuisine = cuisineLine(restaurant);

  return (
    <View style={styles.restCard}>
      <View style={styles.restImageWrap}>
        <SmoothPressable
          style={StyleSheet.absoluteFill}
          onPress={onPress}
          pressScale={0.99}
        >
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={styles.restImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.restImage, styles.imageFallback]} />
          )}
        </SmoothPressable>
        {onToggleFavorite ? (
          <FavoriteHeartButton
            active={!!isFavorite}
            onPress={onToggleFavorite}
            size={16}
            color="#FFFFFF"
            activeColor="#E23744"
            style={styles.heartBtn}
          />
        ) : null}
        <View style={styles.offerBadge} pointerEvents="none">
          <Text style={styles.offerBadgeText} numberOfLines={1}>
            {offer}
          </Text>
          {index % 3 === 0 ? (
            <Text style={styles.offerAd}> | AD</Text>
          ) : null}
        </View>
      </View>

      <SmoothPressable
        style={styles.restBody}
        onPress={onPress}
        pressScale={0.99}
      >
        <Text style={styles.restName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.metaRow}>
          {rating ? (
            <>
              <View style={styles.ratingCircle}>
                <Star color="#FFFFFF" fill="#FFFFFF" size={8} />
              </View>
              <Text style={styles.metaStrong}>
                {rating}
                {reviews ? ` ${reviews}` : ''}
              </Text>
              <Text style={styles.metaDot}>•</Text>
            </>
          ) : null}
          <Text style={styles.metaStrong}>{time}</Text>
        </View>
        <Text style={styles.cuisineLine} numberOfLines={1}>
          {cuisine}
        </Text>
        {(area || distance) && (
          <Text style={styles.areaLine} numberOfLines={1}>
            {[area, distance].filter(Boolean).join(' • ')}
          </Text>
        )}
      </SmoothPressable>
    </View>
  );
}

function DishResultRow({
  dish,
  onPress,
}: {
  dish: SearchDish;
  onPress: () => void;
}) {
  return (
    <SmoothPressable style={styles.dishRow} onPress={onPress} pressScale={0.985}>
      {dish.imageUrl ? (
        <Image source={{ uri: dish.imageUrl }} style={styles.dishThumb} contentFit="cover" />
      ) : (
        <View style={[styles.dishThumb, styles.imageFallback]} />
      )}
      <View style={styles.restBody}>
        <Text style={styles.restName} numberOfLines={1}>
          {dish.name}
        </Text>
        {dish.restaurantName ? (
          <Text style={styles.cuisineLine} numberOfLines={1}>
            {dish.restaurantName}
          </Text>
        ) : null}
        {dish.price > 0 ? (
          <Text style={styles.metaStrong}>₹{dish.price}</Text>
        ) : null}
      </View>
    </SmoothPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  rootSolid: {
    backgroundColor: '#FFFFFF',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  safe: {
    flex: 1,
  },
  curvedPanel: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  resultsChrome: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECED',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
    minHeight: 36,
  },
  titleRowResults: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    color: '#686B78',
  },
  showingWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  showingText: {
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    color: '#3E4152',
  },
  showingFood: {
    fontFamily: fonts.uiBold,
    color: '#02060C',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DADBDF',
    backgroundColor: '#FFFFFF',
    paddingLeft: 18,
    paddingRight: 12,
    gap: 6,
  },
  inputWrap: {
    flex: 1,
    justifyContent: 'center',
    height: 48,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 16,
    color: '#02060C',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : { outlineStyle: 'none' as unknown as 'solid' }),
  },

  clearBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: '#D1D5DB',
  },
  micBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegBtn: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  vegStack: {
    alignItems: 'center',
    gap: 4,
  },
  vegSwitch: {
    width: 28,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  vegSwitchOn: {
    backgroundColor: VEG_GREEN,
  },
  vegKnob: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  vegKnobOn: {
    alignSelf: 'flex-end',
  },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 28,
  },
  tabBtn: {
    paddingBottom: 10,
  },
  tabLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    color: '#9CA3AF',
  },
  tabLabelOn: {
    fontFamily: fonts.uiBold,
    color: '#02060C',
  },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#02060C',
  },
  resultsSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E7',
  },
  filterChipOn: {
    borderColor: authTheme.brand,
    backgroundColor: authTheme.brandSoft,
  },
  filterText: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: '#3E4152',
  },
  filterTextOn: {
    color: authTheme.brandDark,
  },
  varietyRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  suggestionRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    alignItems: 'center',
  },
  suggestionChip: {
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F5F5F6',
    borderWidth: 1,
    borderColor: '#E8E8EC',
  },
  suggestionText: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: '#02060C',
  },
  suggestionType: {
    marginTop: 2,
    fontFamily: fonts.uiMedium,
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  featuredRow: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 12,
  },
  featuredCard: {
    width: 256,
    height: 168,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
  featuredImage: {
    ...StyleSheet.absoluteFill,
  },
  featuredOfferBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: authTheme.brand,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: '70%',
  },
  featuredOfferText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  adBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  adText: {
    fontFamily: fonts.uiBold,
    fontSize: 9,
    color: '#686B78',
    letterSpacing: 0.4,
  },
  featuredGrad: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 28,
    paddingBottom: 12,
  },
  featuredName: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  featuredMetaText: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#FFFFFF',
  },
  featuredDot: {
    color: 'rgba(255,255,255,0.7)',
    marginHorizontal: 2,
  },
  restCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 22,
    gap: 14,
  },
  restImageWrap: {
    width: 108,
    height: 128,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
  restImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    backgroundColor: '#E5E7EB',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerBadge: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  offerBadgeText: {
    flexShrink: 1,
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: '#02060C',
    letterSpacing: 0.1,
  },
  offerAd: {
    fontFamily: fonts.ui,
    fontSize: 10,
    color: '#9CA3AF',
  },
  restBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  restName: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: '#02060C',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  ratingCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: RATING_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  metaStrong: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: '#3E4152',
  },
  metaDot: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 5,
  },
  cuisineLine: {
    marginTop: 5,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#686B78',
  },
  areaLine: {
    marginTop: 3,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },
  dishRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 14,
    alignItems: 'center',
  },
  dishThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
  },
  loadingBox: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyBox: {
    paddingHorizontal: 28,
    paddingTop: 36,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: '#02060C',
    textAlign: 'center',
  },
  emptySub: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: authTheme.brand,
  },
  retryText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
