import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bell,
  BellOff,
  ChevronLeft,
  Clock,
  Flame,
  Leaf,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  UtensilsCrossed,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { CartFloatingBar } from '@/components/order/CartFloatingBar';
import { MenuItemRow } from '@/components/restaurant/MenuItemRow';
import { MenuItemDetailSheet } from '@/components/restaurant/MenuItemDetailSheet';
import { RestaurantReviewsPanel } from '@/components/review/RestaurantReviewsPanel';
import { fonts } from '@/constants/typography';
import { addMenuItemToCart } from '@/lib/order/add-to-cart';
import {
  restaurantEtaLabel,
  restaurantOfferBadges,
  restaurantRatingCount,
  restaurantStars,
} from '@/lib/restaurant/card-display';
import {
  menuCategoryMatchesCuisine,
  resolveMenuCategoryId,
} from '@/lib/restaurant/categories';
import {
  useFullMenu,
  useKitchenAlerts,
  useMenuItem,
  useNotifyOpen,
  useRestaurant,
  useRestaurantBySlug,
  useRestaurantHolidays,
  useRestaurantHygiene,
  useRestaurantItems,
  useRestaurantOffers,
  useRestaurantSpecialHours,
  useRestaurantTimings,
} from '@/lib/restaurant/hooks';
import type { MenuItem } from '@/lib/restaurant/types';
import { useRestaurantReviewStats } from '@/lib/review/hooks';
import { useAuthStore } from '@/store/auth-store';
import { useDeliveryCoords } from '@/store/delivery-location-store';
import { useVegPreferenceStore } from '@/store/veg-preference-store';

const ORANGE = '#F97316';
const INK = '#0B1220';
const MUTED = '#64748B';
const SCREEN_W = Dimensions.get('window').width;
const POPULAR_CARD_W = SCREEN_W * 0.58;
const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

type TabId = 'Menu' | 'Reviews' | 'Info' | 'Offers';

function formatNextOpenAt(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isBestseller(item: MenuItem, index: number) {
  if (item.isBestSeller || item.isRecommended) return true;
  const tags = (item.tags ?? []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => t.includes('best') || t.includes('popular') || t.includes('hit'))) {
    return true;
  }
  return index < 6 && (item.rating ?? 0) >= 4.2;
}

export function RestaurantDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    restaurantId?: string;
    slug?: string;
    category?: string;
    itemId?: string;
  }>();
  const idParam = Array.isArray(params.restaurantId)
    ? params.restaurantId[0]
    : params.restaurantId;
  const slugParam = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const focusCuisine = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const focusItemId = Array.isArray(params.itemId)
    ? params.itemId[0]
    : params.itemId;
  const slugOnly = Boolean(slugParam) && !idParam;
  const coords = useDeliveryCoords();
  const token = useAuthStore((s) => s.token);
  const vegOnly = useVegPreferenceStore((s) => s.mode === 'pure_veg');

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const menuOffsetY = useRef(0);

  const [tab, setTab] = useState<TabId>('Menu');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('popular');
  const [stickyCats, setStickyCats] = useState(false);

  const slugQuery = useRestaurantBySlug(slugOnly ? slugParam || '' : '', coords);
  const idQuery = useRestaurant(idParam || '', coords);
  const restaurant = slugOnly ? slugQuery : idQuery;
  const id = restaurant.data?.id || idParam || '';
  const reviewStats = useRestaurantReviewStats(id, {
    enabled: Boolean(id),
  });
  const menu = useFullMenu(id, {
    name: restaurant.data?.name,
    cuisines: restaurant.data?.cuisines,
  });
  const offers = useRestaurantOffers(id);
  const timings = useRestaurantTimings(id);
  const holidays = useRestaurantHolidays(id);
  const specialHours = useRestaurantSpecialHours(id);
  const hygiene = useRestaurantHygiene(id);
  const alerts = useKitchenAlerts({ enabled: Boolean(token && id) });
  const notifyOpen = useNotifyOpen(id);
  const needle = query.trim().toLowerCase();
  const isSearching = needle.length > 0;
  const searchedItems = useRestaurantItems(
    id,
    {
      q: isSearching ? query.trim() : undefined,
      veg: vegOnly || undefined,
    },
    { enabled: Boolean(id) && isSearching }
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const addItem = (item: MenuItem) => {
    addMenuItemToCart(item, {
      id,
      name: restaurant.data?.name || 'Restaurant',
      imageUrl: restaurant.data?.logoUrl || restaurant.data?.imageUrl,
    });
  };

  const matchesQuery = (item: MenuItem, q: string) => {
    if (!q) return true;
    const hay = [
      item.name,
      item.description,
      item.categoryName,
      ...(item.tags ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  };

  const visibleItems = useMemo(() => {
    if (!vegOnly) return menu.items;
    return menu.items.filter((item) => item.isVeg !== false);
  }, [menu.items, vegOnly]);

  const popularItems = useMemo(() => {
    const recommended = (menu.recommended ?? []).filter((item) =>
      vegOnly ? item.isVeg !== false : true
    );
    if (recommended.length >= 2) return recommended.slice(0, 8);

    const scored = [...visibleItems].sort((a, b) => {
      const ar = a.rating ?? 0;
      const br = b.rating ?? 0;
      if (br !== ar) return br - ar;
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    });
    const picks = scored.filter((_, i) => isBestseller(scored[i], i)).slice(0, 8);
    return picks.length >= 3 ? picks : visibleItems.slice(0, 8);
  }, [menu.recommended, visibleItems, vegOnly]);

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const apiHits = searchedItems.data ?? [];
    if (searchedItems.isSuccess && apiHits.length) {
      return vegOnly ? apiHits.filter((item) => item.isVeg !== false) : apiHits;
    }
    return visibleItems.filter((item) => matchesQuery(item, needle));
  }, [
    isSearching,
    searchedItems.data,
    searchedItems.isSuccess,
    visibleItems,
    needle,
    vegOnly,
  ]);

  const categories = useMemo(() => {
    if (menu.categories.length) return menu.categories;
    const names = new Map<string, string>();
    for (const item of visibleItems) {
      const name = item.categoryName || 'Menu';
      const cid = item.categoryId || name;
      if (!names.has(cid)) names.set(cid, name);
    }
    return [...names.entries()].map(([cid, name]) => ({ id: cid, name }));
  }, [menu.categories, visibleItems]);

  const grouped = useMemo(() => {
    if (isSearching) return [];

    if (!categories.length) {
      return visibleItems.length
        ? [{ id: 'all', name: 'Full menu', items: visibleItems }]
        : [];
    }

    const byCat = categories.map((cat) => ({
      ...cat,
      items: visibleItems.filter((item) => {
        if (item.categoryId && item.categoryId === cat.id) return true;
        if (item.categoryName && item.categoryName === cat.name) return true;
        return false;
      }),
    }));

    const used = new Set(byCat.flatMap((c) => c.items.map((i) => i.id)));
    const leftover = visibleItems.filter((i) => !used.has(i.id));
    if (leftover.length) {
      if (byCat.length === 0) {
        return [{ id: 'all', name: 'Full menu', items: leftover }];
      }
      byCat[0] = { ...byCat[0], items: [...byCat[0].items, ...leftover] };
    }

    const filled = byCat.filter((c) => c.items.length > 0);
    if (filled.length) return filled;

    return visibleItems.length
      ? [{ id: 'all', name: 'Full menu', items: visibleItems }]
      : [];
  }, [categories, visibleItems, isSearching]);

  const onSearchChange = (text: string) => {
    setQuery(text);
    if (text.trim()) {
      setTab('Menu');
      setActiveCat('popular');
    }
  };

  const clearSearch = () => {
    setQuery('');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setStickyCats(y > 280 && tab === 'Menu' && !isSearching);
  };

  const jumpToCategory = (catId: string) => {
    setActiveCat(catId);
    setTab('Menu');
    if (catId === 'popular') {
      scrollRef.current?.scrollTo({ y: 260, animated: true });
      return;
    }
    const y = sectionY.current[catId];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 56), animated: true });
    }
  };

  const onSectionLayout = (catId: string) => (e: LayoutChangeEvent) => {
    sectionY.current[catId] = menuOffsetY.current + e.nativeEvent.layout.y;
  };

  // Deep-link from home/browse cuisine chip → jump to matching menu section
  const didFocusCategory = useRef(false);
  useEffect(() => {
    if (didFocusCategory.current) return;
    // Prefer item deep-link (opens sheet + scrolls); skip category-only jump
    if (focusItemId) return;
    if (!focusCuisine || menu.isLoading) return;
    if (!categories.length) return;

    const matchedId =
      resolveMenuCategoryId(categories, focusCuisine) ||
      categories.find((c) => menuCategoryMatchesCuisine(c, focusCuisine))?.id;

    if (!matchedId) return;
    didFocusCategory.current = true;
    const t = setTimeout(() => jumpToCategory(matchedId), 350);
    return () => clearTimeout(t);
  }, [focusCuisine, focusItemId, menu.isLoading, categories]);

  // Deep-link from category dishes page → open that item on the restaurant menu
  const didFocusItem = useRef(false);
  const focusItemQuery = useMenuItem(id, focusItemId || '');

  useEffect(() => {
    if (didFocusItem.current) return;
    if (!focusItemId || menu.isLoading) return;

    const found =
      menu.items.find((item) => String(item.id) === String(focusItemId)) ||
      (focusItemQuery.data &&
      String(focusItemQuery.data.id) === String(focusItemId)
        ? focusItemQuery.data
        : null);

    if (!found) {
      // Wait for item detail API if list hasn't loaded this dish yet
      if (focusItemQuery.isLoading || focusItemQuery.isFetching) return;
      return;
    }

    didFocusItem.current = true;
    didFocusCategory.current = true;

    const catId =
      found.categoryId ||
      categories.find((c) => c.name === found.categoryName)?.id ||
      (focusCuisine
        ? resolveMenuCategoryId(categories, focusCuisine) ||
          categories.find((c) =>
            menuCategoryMatchesCuisine(c, focusCuisine)
          )?.id
        : undefined);

    setTab('Menu');
    if (catId) setActiveCat(catId);
    setSelectedItem(found);

    const t = setTimeout(() => {
      if (catId) jumpToCategory(catId);
    }, 400);
    return () => clearTimeout(t);
  }, [
    focusItemId,
    focusCuisine,
    menu.isLoading,
    menu.items,
    categories,
    focusItemQuery.data,
    focusItemQuery.isLoading,
    focusItemQuery.isFetching,
  ]);

  if (restaurant.isLoading) {
    return <LoadingView label="Loading restaurant…" />;
  }

  if (restaurant.isError || !restaurant.data) {
    return (
      <View style={styles.errorWrap}>
        <ErrorView
          message={
            restaurant.error instanceof Error
              ? restaurant.error.message
              : 'Restaurant not found'
          }
          onRetry={restaurant.refetch}
        />
      </View>
    );
  }

  const r = restaurant.data;
  const cover =
    r.coverUrl ||
    r.imageUrl ||
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop';
  const logo = r.logoUrl || r.imageUrl;
  const restaurantName = r.name || 'Restaurant';
  const liveStars =
    reviewStats.data && reviewStats.data.average > 0
      ? reviewStats.data.average
      : restaurantStars(r);
  const ratingText = liveStars ? liveStars.toFixed(1) : '—';
  const liveCount =
    reviewStats.data && reviewStats.data.total > 0
      ? reviewStats.data.total
      : restaurantRatingCount(r);
  const reviewsCount = liveCount ? `${liveCount}` : 'New';
  const locationText = r.address || r.city || 'Near you';
  const eta = restaurantEtaLabel(r);
  const cuisineLine = (r.cuisines || []).slice(0, 3).join(' · ') || 'Multi cuisine';
  const offerBadges = restaurantOfferBadges(r);
  const openNow =
    timings.data?.isOpenNow ?? r.isOpenNow ?? r.isOpen ?? r.isOnline;
  const nextOpenLabel = formatNextOpenAt(
    timings.data?.nextOpenAt || r.nextOpenAt
  );
  const kitchenClosed = openNow === false;
  const watchingOpen = (alerts.data ?? []).some(
    (a) =>
      a.restaurantId === id &&
      !a.itemId &&
      a.active !== false &&
      String(a.type).includes('open')
  );

  const catRail = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.catRailContent}
    >
      <Pressable
        style={[styles.catChip, activeCat === 'popular' && styles.catChipOn]}
        onPress={() => jumpToCategory('popular')}
      >
        <Flame
          color={activeCat === 'popular' ? '#FFF' : '#64748B'}
          size={13}
          strokeWidth={2.6}
        />
        <Text
          style={[
            styles.catChipText,
            activeCat === 'popular' && styles.catChipTextOn,
          ]}
        >
          Popular
        </Text>
      </Pressable>
      {grouped.map((cat) => {
        const on = activeCat === cat.id;
        return (
          <Pressable
            key={cat.id}
            style={[styles.catChip, on && styles.catChipOn]}
            onPress={() => jumpToCategory(cat.id)}
          >
            <Text style={[styles.catChipText, on && styles.catChipTextOn]}>
              {cat.name}
            </Text>
            <View style={[styles.catCount, on && styles.catCountOn]}>
              <Text style={[styles.catCountText, on && styles.catCountTextOn]}>
                {cat.items.length}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: 120 + insets.bottom,
        }}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: cover }} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.55)',
              'rgba(0,0,0,0.15)',
              'rgba(11,18,32,0.92)',
            ]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          <SafeAreaView edges={['top']} style={styles.heroSafe}>
            <View style={styles.topBar}>
              <Pressable onPress={goBack} style={styles.glassBtn} hitSlop={8}>
                <ChevronLeft color="#FFF" size={22} strokeWidth={2.4} />
              </Pressable>

              {eta ? (
                <View style={styles.etaPill}>
                  <Clock color={INK} size={11} strokeWidth={2.6} />
                  <Text style={styles.etaText}>{eta}</Text>
                </View>
              ) : null}
            </View>
          </SafeAreaView>

          <View style={styles.heroBottom}>
            <View style={styles.heroIdentity}>
              <View style={styles.logoWrap}>
                {logo ? (
                  <Image
                    source={{ uri: logo }}
                    style={styles.logoImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.logoFallback}>
                    {restaurantName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>
                  {restaurantName}
                </Text>
                <Text style={styles.cuisineLine} numberOfLines={1}>
                  {cuisineLine}
                </Text>
                {offerBadges.length ? (
                  <Text style={styles.offerLine} numberOfLines={1}>
                    {offerBadges.join(' · ')}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.ratingPill}>
                <Star color="#FBBF24" fill="#FBBF24" size={13} />
                <Text style={styles.ratingNum}>{ratingText}</Text>
                <Text style={styles.ratingCount}>{reviewsCount}</Text>
              </View>
              <View style={styles.metaDot} />
              <MapPin color="rgba(255,255,255,0.75)" size={13} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationText}
              </Text>
              {kitchenClosed ? (
                <View style={[styles.statusPill, styles.closedPill]}>
                  <Text style={styles.closedText}>
                    {nextOpenLabel ? `Opens ${nextOpenLabel}` : 'Closed'}
                  </Text>
                </View>
              ) : (
                <View style={[styles.statusPill, styles.openPill]}>
                  <Text style={styles.openText}>Open</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Search sits above Menu / Offers / Reviews / Info */}
        <View style={styles.searchWrap}>
          <Search color={MUTED} size={16} strokeWidth={2.4} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={onSearchChange}
            onFocus={() => {
              setTab('Menu');
            }}
            placeholder={vegOnly ? 'Search veg dishes…' : 'Search dishes on this menu…'}
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
            blurOnSubmit={false}
          />
          {vegOnly ? (
            <View style={styles.vegSearchChip}>
              <Leaf color="#15803D" size={12} />
              <Text style={styles.vegSearchText}>Veg</Text>
            </View>
          ) : null}
          {query ? (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X color={MUTED} size={16} />
            </Pressable>
          ) : null}
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrap}>
          {(['Menu', 'Offers', 'Reviews', 'Info'] as TabId[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'Menu' ? (
          <View
            onLayout={(e) => {
              menuOffsetY.current = e.nativeEvent.layout.y;
            }}
          >
            {isSearching ? (
              <View style={styles.searchResultsBlock}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>
                    {searchResults.length} result
                    {searchResults.length === 1 ? '' : 's'}
                  </Text>
                  <Text style={styles.sectionSub}>
                    Showing matches for “{query.trim()}”
                  </Text>
                </View>

                {menu.isLoading ? (
                  <LoadingView label="Loading menu…" />
                ) : searchResults.length === 0 ? (
                  <View style={styles.emptyMenu}>
                    <Search color={MUTED} size={26} />
                    <Text style={styles.emptyTitle}>No dishes found</Text>
                    <Text style={styles.emptySub}>
                      Try another name, or clear search to browse the full menu.
                    </Text>
                    <Pressable style={styles.clearSearchBtn} onPress={clearSearch}>
                      <Text style={styles.clearSearchBtnText}>Clear search</Text>
                    </Pressable>
                  </View>
                ) : (
                  searchResults.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      onPress={() => setSelectedItem(item)}
                      onAdd={() => addItem(item)}
                    />
                  ))
                )}
              </View>
            ) : (
              <>
                {/* Inline category rail */}
                <View style={styles.catRailInline}>{catRail}</View>

                {/* Popular picks */}
                {popularItems.length > 0 ? (
                  <Animated.View entering={FadeInDown.delay(60).duration(360)}>
                    <View style={styles.sectionHead}>
                      <View style={styles.sectionTitleRow}>
                        <Flame color={ORANGE} size={18} strokeWidth={2.6} />
                        <Text style={styles.sectionTitle}>
                          {(menu.recommended?.length ?? 0) >= 2
                            ? 'Recommended'
                            : 'Popular picks'}
                        </Text>
                      </View>
                      <Text style={styles.sectionSub}>
                        {(menu.recommended?.length ?? 0) >= 2
                          ? 'Bestsellers from this kitchen'
                          : 'Crowd favourites — tap to customise'}
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={POPULAR_CARD_W + 14}
                      contentContainerStyle={styles.popularRow}
                      keyboardShouldPersistTaps="handled"
                    >
                      {popularItems.map((item, i) => (
                        <Animated.View
                          key={item.id}
                          entering={FadeInRight.delay(40 + i * 40).duration(340)}
                        >
                          <Pressable
                            style={[styles.popularCard, { width: POPULAR_CARD_W }]}
                            onPress={() => setSelectedItem(item)}
                          >
                            <Image
                              source={{
                                uri:
                                  item.imageUrl ||
                                  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop',
                              }}
                              style={styles.popularImage}
                              contentFit="cover"
                            />
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.82)']}
                              style={styles.popularGrad}
                            />
                            <View style={styles.popularBadge}>
                              <Sparkles color="#FFF" size={11} strokeWidth={2.4} />
                              <Text style={styles.popularBadgeText}>
                                {i === 0 ? 'Chef’s pick' : 'Bestseller'}
                              </Text>
                            </View>
                            <View style={styles.popularCopy}>
                              <Text style={styles.popularName} numberOfLines={2}>
                                {item.name}
                              </Text>
                              <View style={styles.popularFooter}>
                                <Text style={styles.popularPrice}>
                                  ₹{item.price}
                                </Text>
                                <Pressable
                                  style={styles.popularAdd}
                                  onPress={() => addItem(item)}
                                >
                                  <Text style={styles.popularAddText}>ADD</Text>
                                </Pressable>
                              </View>
                            </View>
                          </Pressable>
                        </Animated.View>
                      ))}
                    </ScrollView>
                  </Animated.View>
                ) : null}

                {/* Menu by category */}
                {menu.isLoading ? (
                  <LoadingView label="Loading menu…" />
                ) : grouped.length === 0 ? (
                  <View style={styles.emptyMenu}>
                    <UtensilsCrossed color={MUTED} size={28} />
                    <Text style={styles.emptyTitle}>No dishes found</Text>
                    <Text style={styles.emptySub}>
                      This restaurant has not added menu items yet.
                    </Text>
                  </View>
                ) : (
                  grouped.map((cat, sectionIndex) => (
                    <Animated.View
                      key={cat.id}
                      entering={FadeInDown.delay(80 + sectionIndex * 40).duration(360)}
                      onLayout={onSectionLayout(cat.id)}
                      style={styles.categoryBlock}
                    >
                      <View style={styles.categoryHead}>
                        <View>
                          <Text style={styles.categoryTitle}>{cat.name}</Text>
                          <Text style={styles.categorySub}>
                            {cat.items.length} item
                            {cat.items.length === 1 ? '' : 's'}
                          </Text>
                        </View>
                        <View style={styles.categoryAccent} />
                      </View>

                      {cat.items.map((item) => (
                        <MenuItemRow
                          key={item.id}
                          item={item}
                          onPress={() => setSelectedItem(item)}
                          onAdd={() => addItem(item)}
                        />
                      ))}
                    </Animated.View>
                  ))
                )}
              </>
            )}
          </View>
        ) : null}

        {tab === 'Offers' ? (
          <View style={styles.panelPad}>
            {(offers.data ?? []).length === 0 ? (
              <View style={styles.emptyMenu}>
                <Tag color={ORANGE} size={26} />
                <Text style={styles.emptyTitle}>No live offers</Text>
                <Text style={styles.emptySub}>
                  Check back soon — deals land here first.
                </Text>
              </View>
            ) : (
              (offers.data ?? []).map((offer, i) => (
                <Animated.View
                  key={offer.id}
                  entering={FadeInDown.delay(i * 50).duration(320)}
                  style={styles.offerCard}
                >
                  <LinearGradient
                    colors={['#FFF7ED', '#FFFFFF']}
                    style={styles.offerGrad}
                  >
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    {offer.description ? (
                      <Text style={styles.offerDesc}>{offer.description}</Text>
                    ) : null}
                    {offer.code ? (
                      <View style={styles.codePill}>
                        <Text style={styles.codeText}>{offer.code}</Text>
                      </View>
                    ) : null}
                  </LinearGradient>
                </Animated.View>
              ))
            )}
          </View>
        ) : null}

        {tab === 'Reviews' ? (
          <RestaurantReviewsPanel restaurantId={id} />
        ) : null}

        {tab === 'Info' ? (
          <View style={styles.panelPad}>
            <Text style={styles.infoLabel}>About</Text>
            <Text style={styles.infoBody}>
              {r.description ||
                `${restaurantName} serves ${cuisineLine.toLowerCase()}. Order fresh favourites with live tracking.`}
            </Text>

            {(r.cuisines?.length || r.tags?.length) ? (
              <>
                <Text style={[styles.infoLabel, { marginTop: 18 }]}>Cuisines</Text>
                <View style={styles.infoChips}>
                  {(r.cuisines?.length ? r.cuisines : r.tags || [])
                    .slice(0, 8)
                    .map((c) => (
                      <View key={c} style={styles.infoChip}>
                        <Text style={styles.infoChipText}>{c}</Text>
                      </View>
                    ))}
                </View>
              </>
            ) : null}

            <Text style={[styles.infoLabel, { marginTop: 18 }]}>Address</Text>
            <Text style={styles.infoBody}>{locationText}</Text>

            <View style={styles.infoMetaGrid}>
              {typeof r.costForTwo === 'number' ||
              typeof r.priceForTwo === 'number' ? (
                <View style={styles.infoMetaCard}>
                  <Text style={styles.infoMetaLabel}>Cost for two</Text>
                  <Text style={styles.infoMetaValue}>
                    ₹{r.costForTwo ?? r.priceForTwo}
                    {r.priceRange ? ` · ${r.priceRange}` : ''}
                  </Text>
                </View>
              ) : null}
              {eta ? (
                <View style={styles.infoMetaCard}>
                  <Text style={styles.infoMetaLabel}>Prep / delivery</Text>
                  <Text style={styles.infoMetaValue}>{eta}</Text>
                </View>
              ) : null}
              {typeof r.distance === 'number' ? (
                <View style={styles.infoMetaCard}>
                  <Text style={styles.infoMetaLabel}>Distance</Text>
                  <Text style={styles.infoMetaValue}>
                    {r.distance.toFixed(1)} km
                  </Text>
                </View>
              ) : null}
              {typeof r.minOrderValue === 'number' && r.minOrderValue > 0 ? (
                <View style={styles.infoMetaCard}>
                  <Text style={styles.infoMetaLabel}>Min order</Text>
                  <Text style={styles.infoMetaValue}>₹{r.minOrderValue}</Text>
                </View>
              ) : null}
              {typeof r.freeDeliveryThreshold === 'number' &&
              r.freeDeliveryThreshold > 0 ? (
                <View style={styles.infoMetaCard}>
                  <Text style={styles.infoMetaLabel}>Free delivery</Text>
                  <Text style={styles.infoMetaValue}>
                    above ₹{r.freeDeliveryThreshold}
                  </Text>
                </View>
              ) : null}
              {typeof r.maxDeliveryRadius === 'number' &&
              r.maxDeliveryRadius > 0 ? (
                <View style={styles.infoMetaCard}>
                  <Text style={styles.infoMetaLabel}>Delivers within</Text>
                  <Text style={styles.infoMetaValue}>
                    {r.maxDeliveryRadius} km
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.infoLabel, { marginTop: 18 }]}>
              Outlet status
            </Text>
            <Text style={styles.infoBody}>
              {kitchenClosed
                ? nextOpenLabel
                  ? `Currently closed · opens ${nextOpenLabel}`
                  : 'Currently closed / offline'
                : openNow
                  ? 'Open now · accepting orders'
                  : 'Hours may vary'}
              {r.isPureVeg ? ' · Pure veg' : ''}
              {typeof hygiene.data?.hygieneScore === 'number'
                ? ` · Hygiene ${hygiene.data.hygieneScore}`
                : typeof r.hygieneScore === 'number'
                  ? ` · Hygiene ${r.hygieneScore}`
                  : ''}
            </Text>

            {kitchenClosed && token ? (
              <Pressable
                style={styles.notifyBtn}
                onPress={() => {
                  if (watchingOpen) notifyOpen.unsubscribe.mutate();
                  else notifyOpen.subscribe.mutate();
                }}
                disabled={
                  notifyOpen.subscribe.isPending ||
                  notifyOpen.unsubscribe.isPending
                }
              >
                {watchingOpen ? (
                  <BellOff color="#9A3412" size={16} />
                ) : (
                  <Bell color="#9A3412" size={16} />
                )}
                <Text style={styles.notifyBtnText}>
                  {watchingOpen
                    ? 'Stop kitchen-open alert'
                    : 'Notify me when this kitchen opens'}
                </Text>
              </Pressable>
            ) : null}

            <Text style={[styles.infoLabel, { marginTop: 18 }]}>Payments</Text>
            <Text style={styles.infoBody}>
              {[
                r.isOnlinePayment !== false ? 'Online payment' : null,
                r.isCashOnDelivery !== false ? 'Cash on delivery' : null,
                r.acceptScheduledOrders ? 'Scheduled orders' : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Standard payment options'}
            </Text>

            {timings.data?.slots && Object.keys(timings.data.slots).length ? (
              <>
                <Text style={[styles.infoLabel, { marginTop: 18 }]}>
                  Weekly timings (IST)
                </Text>
                {[
                  ...WEEKDAYS.filter((day) => timings.data?.slots?.[day] != null),
                  ...Object.keys(timings.data.slots).filter(
                    (day) =>
                      !WEEKDAYS.includes(
                        day.toLowerCase() as (typeof WEEKDAYS)[number]
                      )
                  ),
                ].map((day) => {
                  const value = timings.data?.slots?.[day];
                  const slotText = Array.isArray(value)
                    ? value
                        .map(
                          (s) =>
                            s.label ||
                            (s.open && s.close ? `${s.open}–${s.close}` : s.open)
                        )
                        .filter(Boolean)
                        .join(', ')
                    : String(value ?? '');
                  return (
                    <View key={day} style={styles.timingRow}>
                      <Text style={styles.timingDay}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Text>
                      <Text style={styles.timingValue}>
                        {slotText || 'Closed'}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : r.timings ? (
              <>
                <Text style={[styles.infoLabel, { marginTop: 18 }]}>
                  Weekly timings
                </Text>
                {Object.entries(r.timings).map(([day, value]) => {
                  const dayInfo =
                    value && typeof value === 'object'
                      ? (value as Record<string, unknown>)
                      : {};
                  const open = dayInfo.isOpen === true;
                  const slots = Array.isArray(dayInfo.slots)
                    ? (dayInfo.slots as { open?: string; close?: string }[])
                    : [];
                  const slotText = slots
                    .map((s) =>
                      s.open && s.close ? `${s.open}–${s.close}` : null
                    )
                    .filter(Boolean)
                    .join(', ');
                  return (
                    <View key={day} style={styles.timingRow}>
                      <Text style={styles.timingDay}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Text>
                      <Text style={styles.timingValue}>
                        {open ? slotText || 'Open' : 'Closed'}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : null}

            {(holidays.data?.length ?? 0) > 0 ? (
              <>
                <Text style={[styles.infoLabel, { marginTop: 18 }]}>
                  Upcoming closed dates
                </Text>
                {holidays.data!.slice(0, 5).map((h) => (
                  <View key={h.date} style={styles.timingRow}>
                    <Text style={styles.timingDay}>{h.date}</Text>
                    <Text style={styles.timingValue}>
                      {h.reason || 'Closed'}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}

            {(specialHours.data?.length ?? 0) > 0 ? (
              <>
                <Text style={[styles.infoLabel, { marginTop: 18 }]}>
                  Special hours
                </Text>
                {specialHours.data!.slice(0, 5).map((sh) => (
                  <View key={sh.date} style={styles.timingRow}>
                    <Text style={styles.timingDay}>{sh.date}</Text>
                    <Text style={styles.timingValue}>
                      {sh.openTime}–{sh.closeTime}
                      {sh.reason ? ` (${sh.reason})` : ''}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}

            {hygiene.data?.fssaiMasked ||
            typeof hygiene.data?.hygieneScore === 'number' ? (
              <>
                <Text style={[styles.infoLabel, { marginTop: 18 }]}>
                  Hygiene
                </Text>
                <View style={styles.hygieneRow}>
                  <ShieldCheck color="#15803D" size={16} />
                  <Text style={styles.infoBody}>
                    {[
                      hygiene.data?.fssaiMasked
                        ? `FSSAI ${hygiene.data.fssaiMasked}`
                        : null,
                      typeof hygiene.data?.hygieneScore === 'number'
                        ? `Score ${hygiene.data.hygieneScore}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky category strip */}
      {stickyCats && !isSearching ? (
        <View
          style={[styles.stickyCats, { paddingTop: insets.top + 6 }]}
          pointerEvents="box-none"
        >
          {catRail}
        </View>
      ) : null}

      {selectedItem ? (
        <MenuItemDetailSheet
          item={selectedItem}
          restaurantId={id}
          restaurantName={restaurant.data?.name}
          onClose={() => setSelectedItem(null)}
        />
      ) : null}

      <CartFloatingBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroWrap: {
    height: 300,
    width: '100%',
    backgroundColor: '#111',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroSafe: {
    zIndex: 2,
  },
  topBar: {
    paddingHorizontal: 14,
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 12,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  etaText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: INK,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 4,
  },
  openPill: {
    backgroundColor: 'rgba(34,197,94,0.95)',
  },
  openText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: '#FFF',
  },
  closedPill: {
    backgroundColor: 'rgba(239,68,68,0.95)',
  },
  closedText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: '#FFF',
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: ORANGE,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  cuisineLine: {
    marginTop: 2,
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
  },
  offerLine: {
    marginTop: 4,
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#FDBA74',
  },
  vegSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vegSearchText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: '#15803D',
  },
  notifyBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notifyBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#9A3412',
  },
  hygieneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ratingNum: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#FFF',
  },
  ratingCount: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  locationText: {
    flex: 1,
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: INK,
    paddingVertical: 0,
  },
  tabsWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  tabActive: {
    backgroundColor: ORANGE,
  },
  tabText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#475569',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  catRailInline: {
    marginBottom: 8,
  },
  catRailContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipOn: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  catChipText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#64748B',
  },
  catChipTextOn: {
    color: '#FFFFFF',
  },
  catCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCountOn: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  catCountText: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: '#64748B',
  },
  catCountTextOn: {
    color: '#FFF',
  },
  sectionHead: {
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: INK,
    letterSpacing: -0.3,
  },
  sectionSub: {
    marginTop: 4,
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: MUTED,
  },
  popularRow: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 8,
  },
  popularCard: {
    height: 168,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  popularImage: {
    ...StyleSheet.absoluteFillObject,
  },
  popularGrad: {
    ...StyleSheet.absoluteFillObject,
  },
  popularBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ORANGE,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  popularBadgeText: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: '#FFF',
  },
  popularCopy: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    gap: 8,
  },
  popularName: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: '#FFF',
    lineHeight: 19,
  },
  popularFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  popularPrice: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: '#FFF',
  },
  popularAdd: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  popularAddText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: ORANGE,
  },
  categoryBlock: {
    marginTop: 18,
  },
  categoryHead: {
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  categoryTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: INK,
    letterSpacing: -0.2,
  },
  categorySub: {
    marginTop: 2,
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: MUTED,
  },
  categoryAccent: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: ORANGE,
    marginBottom: 8,
  },
  emptyMenu: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 28,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
  },
  emptySub: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  clearSearchBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: ORANGE,
  },
  clearSearchBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  searchResultsBlock: {
    paddingTop: 4,
  },
  panelPad: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  offerCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  offerGrad: {
    padding: 16,
  },
  offerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
  },
  offerDesc: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  codePill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: INK,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  codeText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#FFF',
    letterSpacing: 1,
  },
  reviewHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  reviewScore: {
    fontFamily: fonts.display,
    fontSize: 42,
    color: INK,
    letterSpacing: -1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  reviewMeta: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: MUTED,
  },
  infoLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: ORANGE,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  infoBody: {
    marginTop: 6,
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    color: INK,
    lineHeight: 22,
  },
  infoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  infoChip: {
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  infoChipText: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: '#9A3412',
  },
  infoMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  infoMetaCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoMetaLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    color: MUTED,
  },
  infoMetaValue: {
    marginTop: 4,
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: INK,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  timingDay: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: MUTED,
    width: 100,
  },
  timingValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: INK,
  },
  stickyCats: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248,250,252,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
    zIndex: 20,
  },
});
