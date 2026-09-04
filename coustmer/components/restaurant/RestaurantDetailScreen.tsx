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
  SlidersHorizontal,
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
import {
  formatDistanceKm,
  formatNextOpenAt,
  resolveRestaurantDistanceKm,
  restaurantDetailEtaLabel,
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
  useRestaurantRatings,
  useRestaurantSpecialHours,
  useRestaurantTimings,
  useUnavailableItemIds,
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
type MenuFilter = 'all' | 'veg' | 'non_veg' | 'bestsellers' | 'recommended';

function isBestseller(item: MenuItem, index: number) {
  if (item.isBestSeller || item.isRecommended) return true;
  const tags = (item.tags ?? []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => t.includes('best') || t.includes('popular') || t.includes('hit'))) {
    return true;
  }
  // Only promote high-rated dishes when the API actually sent a rating.
  return typeof item.rating === 'number' && item.rating >= 4.2 && index < 6;
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
  const vegMode = useVegPreferenceStore((s) => s.mode);
  const setVegMode = useVegPreferenceStore((s) => s.setMode);
  const vegOnly = vegMode === 'pure_veg';

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const menuOffsetY = useRef(0);

  const [tab, setTab] = useState<TabId>('Menu');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('popular');
  const [stickyCats, setStickyCats] = useState(false);
  const [menuFilter, setMenuFilter] = useState<MenuFilter>(
    vegOnly ? 'veg' : 'all'
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

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
  const ratingsHistogram = useRestaurantRatings(id);
  const { data: unavailableIds } = useUnavailableItemIds(id);
  const unavailableSet = new Set(unavailableIds ?? []);
  const alerts = useKitchenAlerts({ enabled: Boolean(token && id) });
  const notifyOpen = useNotifyOpen(id);
  const needle = query.trim().toLowerCase();
  const isSearching = needle.length > 0;
  const searchedItems = useRestaurantItems(
    id,
    {
      q: isSearching ? query.trim() : undefined,
      veg: menuFilter === 'veg' || vegOnly || undefined,
    },
    { enabled: Boolean(id) && isSearching }
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const addItem = (item: MenuItem) => {
    // Always open detail sheet so restaurant-configured sizes / add-ons can be chosen.
    setSelectedItem(item);
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
    let items = menu.items;
    if (menuFilter === 'veg' || vegOnly) {
      items = items.filter((item) => item.isVeg === true);
    } else if (menuFilter === 'non_veg') {
      items = items.filter((item) => item.isVeg === false);
    } else if (menuFilter === 'bestsellers') {
      const bestsellers = items.filter(
        (item) =>
          item.isBestSeller === true ||
          (item.tags ?? []).some((t) =>
            String(t).toLowerCase().includes('best')
          )
      );
      items =
        bestsellers.length > 0
          ? bestsellers
          : [...items]
              .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
              .slice(0, 12);
    } else if (menuFilter === 'recommended') {
      const fromApi = (menu.recommended ?? []).filter((item) =>
        vegOnly || menuFilter === 'veg' ? item.isVeg === true : true
      );
      const flagged = items.filter(
        (item) =>
          item.isRecommended === true ||
          item.isBestSeller === true ||
          (item.tags ?? []).some((t) => {
            const tag = String(t).toLowerCase();
            return (
              tag.includes('recommend') ||
              tag.includes('chef') ||
              tag.includes('popular') ||
              tag.includes('best')
            );
          })
      );
      const byId = new Map<string, MenuItem>();
      for (const item of [...fromApi, ...flagged]) {
        byId.set(item.id, item);
      }
      const merged = [...byId.values()];
      if (merged.length > 0) {
        items = merged;
      } else {
        // Kitchen didn't mark recommended — show top-rated / first dishes so filter isn't empty.
        const scored = [...items].sort((a, b) => {
          const ar = a.rating ?? 0;
          const br = b.rating ?? 0;
          if (br !== ar) return br - ar;
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        });
        items = (scored.length ? scored : menu.items).slice(0, 12);
      }
    }
    return items;
  }, [menu.items, menu.recommended, menuFilter, vegOnly]);

  const popularItems = useMemo(() => {
    const recommended = (menu.recommended ?? []).filter((item) =>
      vegOnly || menuFilter === 'veg' ? item.isVeg === true : true
    );
    if (recommended.length >= 2) return recommended.slice(0, 8);

    const pool =
      menuFilter === 'recommended' || menuFilter === 'bestsellers'
        ? visibleItems
        : menu.items.filter((item) =>
            vegOnly || menuFilter === 'veg' ? item.isVeg === true : true
          );

    const scored = [...pool].sort((a, b) => {
      const ar = a.rating ?? 0;
      const br = b.rating ?? 0;
      if (br !== ar) return br - ar;
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    });
    const picks = scored.filter((_, i) => isBestseller(scored[i], i)).slice(0, 8);
    return picks.length >= 3 ? picks : pool.slice(0, 8);
  }, [menu.recommended, menu.items, visibleItems, vegOnly, menuFilter]);

  const searchSuggestions = useMemo(() => {
    const pool = menu.items.filter((item) => {
      if (vegOnly || menuFilter === 'veg') return item.isVeg === true;
      if (menuFilter === 'non_veg') return item.isVeg === false;
      return true;
    });
    if (!pool.length) return [] as MenuItem[];

    if (!needle) {
      const featured = [
        ...(menu.recommended ?? []),
        ...pool.filter((i) => i.isBestSeller || i.isRecommended),
        ...pool,
      ];
      const seen = new Set<string>();
      const out: MenuItem[] = [];
      for (const item of featured) {
        if (seen.has(item.id)) continue;
        if (vegOnly || menuFilter === 'veg') {
          if (item.isVeg !== true) continue;
        }
        seen.add(item.id);
        out.push(item);
        if (out.length >= 8) break;
      }
      return out;
    }

    return pool
      .filter((item) => matchesQuery(item, needle))
      .slice(0, 8);
  }, [menu.items, menu.recommended, needle, vegOnly, menuFilter]);

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const apiHits = searchedItems.data ?? [];
    let results =
      searchedItems.isSuccess && apiHits.length
        ? apiHits
        : menu.items.filter((item) => matchesQuery(item, needle));

    if (menuFilter === 'veg' || vegOnly) {
      results = results.filter((item) => item.isVeg === true);
    } else if (menuFilter === 'non_veg') {
      results = results.filter((item) => item.isVeg === false);
    } else if (menuFilter === 'bestsellers') {
      const bestsellers = results.filter((item) => item.isBestSeller === true);
      if (bestsellers.length) results = bestsellers;
    } else if (menuFilter === 'recommended') {
      const flagged = results.filter(
        (item) => item.isRecommended === true || item.isBestSeller === true
      );
      if (flagged.length) results = flagged;
    }
    return results;
  }, [
    isSearching,
    searchedItems.data,
    searchedItems.isSuccess,
    menu.items,
    needle,
    vegOnly,
    menuFilter,
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
  const cover = r.coverUrl || r.imageUrl || '';
  const logo = r.logoUrl || r.imageUrl;
  const restaurantName = r.name || 'Restaurant';

  const histAvg =
    ratingsHistogram.data &&
    typeof ratingsHistogram.data.avgRating === 'number' &&
    ratingsHistogram.data.avgRating > 0
      ? ratingsHistogram.data.avgRating
      : null;
  const histCount =
    ratingsHistogram.data &&
    typeof ratingsHistogram.data.totalRatings === 'number' &&
    ratingsHistogram.data.totalRatings > 0
      ? ratingsHistogram.data.totalRatings
      : null;

  const liveStars =
    reviewStats.data && reviewStats.data.average > 0
      ? reviewStats.data.average
      : histAvg ?? restaurantStars(r) ?? null;
  const liveCount =
    reviewStats.data && reviewStats.data.total > 0
      ? reviewStats.data.total
      : histCount ?? restaurantRatingCount(r) ?? null;

  const ratingText =
    typeof liveStars === 'number' && liveStars > 0
      ? liveStars.toFixed(1)
      : null;
  const reviewsCount =
    typeof liveCount === 'number' && liveCount > 0
      ? `${liveCount}`
      : null;
  const locationText = r.address || r.city || 'Near you';
  const distanceKm = resolveRestaurantDistanceKm(r, coords);
  const distanceLabel = formatDistanceKm(distanceKm ?? undefined);
  const eta = restaurantDetailEtaLabel(r, distanceKm);
  const cuisineLine =
    (r.cuisines || []).slice(0, 3).join(' · ') ||
    (r.menuCategories || []).slice(0, 2).join(' · ') ||
    null;
  const offerBadges = restaurantOfferBadges(r);

  // Prefer live timings API; never assume Open when status is unknown.
  const timingsOpen = timings.data?.isOpenNow;
  const dtoOpen = r.isOpenNow ?? r.isOpen ?? r.isOnline;
  const openNow =
    typeof timingsOpen === 'boolean'
      ? timingsOpen
      : typeof dtoOpen === 'boolean'
        ? dtoOpen
        : undefined;
  const openStatusLoading = timings.isLoading && openNow === undefined;
  const kitchenClosed = openNow === false;
  const kitchenOpen = openNow === true;
  const nextOpenLabel = formatNextOpenAt(
    timings.data?.nextOpenAt || r.nextOpenAt
  );
  const watchingOpen = (alerts.data ?? []).some(
    (a) =>
      a.restaurantId === id &&
      !a.itemId &&
      a.active !== false &&
      String(a.type).includes('open')
  );

  const applyMenuFilter = (next: MenuFilter) => {
    setMenuFilter(next);
    setFiltersOpen(false);
    setTab('Menu');
    if (next === 'veg') {
      setVegMode('pure_veg');
    } else if (vegMode === 'pure_veg' && next !== 'veg') {
      setVegMode('all');
    }
  };

  const filterChips: Array<{ id: MenuFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'veg', label: 'Veg' },
    { id: 'non_veg', label: 'Non-veg' },
    { id: 'bestsellers', label: 'Bestsellers' },
    { id: 'recommended', label: 'Recommended' },
  ];

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
          {cover ? (
            <Image source={{ uri: cover }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]} />
          )}
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
              ) : distanceLabel ? (
                <View style={styles.etaPill}>
                  <MapPin color={INK} size={11} strokeWidth={2.6} />
                  <Text style={styles.etaText}>{distanceLabel}</Text>
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
                {cuisineLine ? (
                  <Text style={styles.cuisineLine} numberOfLines={1}>
                    {cuisineLine}
                  </Text>
                ) : null}
                {offerBadges.length ? (
                  <Text style={styles.offerLine} numberOfLines={1}>
                    {offerBadges.join(' · ')}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.ratingPill}>
                <Star
                  color={ratingText ? '#FBBF24' : 'rgba(255,255,255,0.55)'}
                  fill={ratingText ? '#FBBF24' : 'transparent'}
                  size={13}
                />
                <Text style={styles.ratingNum}>
                  {ratingText ?? 'No ratings'}
                </Text>
                {reviewsCount ? (
                  <Text style={styles.ratingCount}>{reviewsCount}</Text>
                ) : null}
              </View>
              {distanceLabel ? (
                <>
                  <View style={styles.metaDot} />
                  <View style={styles.statPill}>
                    <MapPin color="rgba(255,255,255,0.85)" size={12} />
                    <Text style={styles.statPillText}>{distanceLabel}</Text>
                  </View>
                </>
              ) : null}
              {eta ? (
                <>
                  <View style={styles.metaDot} />
                  <View style={styles.statPill}>
                    <Clock color="rgba(255,255,255,0.85)" size={12} />
                    <Text style={styles.statPillText}>{eta}</Text>
                  </View>
                </>
              ) : null}
              {openStatusLoading ? (
                <View style={[styles.statusPill, styles.pendingPill]}>
                  <Text style={styles.pendingText}>…</Text>
                </View>
              ) : kitchenClosed ? (
                <View style={[styles.statusPill, styles.closedPill]}>
                  <Text style={styles.closedText}>
                    {nextOpenLabel ? `Opens ${nextOpenLabel}` : 'Closed'}
                  </Text>
                </View>
              ) : kitchenOpen ? (
                <View style={[styles.statusPill, styles.openPill]}>
                  <Text style={styles.openText}>Open</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.addressRow}>
              <MapPin color="rgba(255,255,255,0.65)" size={12} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationText}
              </Text>
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
              setSearchFocused(true);
            }}
            onBlur={() => {
              // Delay so suggestion taps register before chips unmount.
              setTimeout(() => setSearchFocused(false), 180);
            }}
            placeholder={
              menuFilter === 'veg' || vegOnly
                ? 'Search veg dishes…'
                : 'Search dishes on this menu…'
            }
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => {
              setFiltersOpen((v) => !v);
              setTab('Menu');
            }}
            style={[styles.filterBtn, (filtersOpen || menuFilter !== 'all') && styles.filterBtnOn]}
            hitSlop={8}
            accessibilityLabel="Menu filters"
          >
            <SlidersHorizontal
              color={filtersOpen || menuFilter !== 'all' ? ORANGE : MUTED}
              size={15}
              strokeWidth={2.4}
            />
          </Pressable>
          {query ? (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X color={MUTED} size={16} />
            </Pressable>
          ) : null}
        </View>

        {(searchFocused || needle.length > 0) &&
        searchSuggestions.length > 0 &&
        tab === 'Menu' ? (
          <View style={styles.suggestBlock}>
            <Text style={styles.suggestLabel}>
              {needle ? 'Suggestions' : 'Popular on this menu'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.suggestRail}
            >
              {searchSuggestions.map((item) => (
                <Pressable
                  key={`suggest-${item.id}`}
                  style={styles.suggestChip}
                  onPress={() => {
                    setQuery(item.name);
                    setTab('Menu');
                    setActiveCat('popular');
                    setSelectedItem(item);
                    setSearchFocused(false);
                  }}
                >
                  <Text style={styles.suggestChipText} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.suggestPrice}>₹{item.price}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {filtersOpen || menuFilter !== 'all' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRail}
            keyboardShouldPersistTaps="handled"
          >
            {filterChips.map((chip) => {
              const on = menuFilter === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  style={[styles.filterChip, on && styles.filterChipOn]}
                  onPress={() => applyMenuFilter(chip.id)}
                >
                  {chip.id === 'veg' ? (
                    <Leaf color={on ? '#FFF' : '#15803D'} size={12} />
                  ) : null}
                  <Text
                    style={[styles.filterChipText, on && styles.filterChipTextOn]}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

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
                      unavailable={unavailableSet.has(item.id)}
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
                      {popularItems.map((item, i) => {
                        const badge =
                          item.isRecommended
                            ? 'Chef’s pick'
                            : item.isBestSeller
                              ? 'Bestseller'
                              : null;
                        const photo = item.imageUrl?.trim() || '';
                        return (
                        <Animated.View
                          key={item.id}
                          entering={FadeInRight.delay(40 + i * 40).duration(340)}
                        >
                          <Pressable
                            style={[styles.popularCard, { width: POPULAR_CARD_W }]}
                            onPress={() => setSelectedItem(item)}
                          >
                            {photo ? (
                              <Image
                                source={{ uri: photo }}
                                style={styles.popularImage}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={[styles.popularImage, styles.popularImageFallback]}>
                                <UtensilsCrossed color="#94A3B8" size={28} />
                              </View>
                            )}
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.82)']}
                              style={styles.popularGrad}
                            />
                            {badge ? (
                              <View style={styles.popularBadge}>
                                <Sparkles color="#FFF" size={11} strokeWidth={2.4} />
                                <Text style={styles.popularBadgeText}>
                                  {badge}
                                </Text>
                              </View>
                            ) : null}
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
                        );
                      })}
                    </ScrollView>
                  </Animated.View>
                ) : null}

                {/* Menu by category */}
                {menu.isLoading ? (
                  <LoadingView label="Loading menu…" />
                ) : grouped.length === 0 ? (
                  <View style={styles.emptyMenu}>
                    <UtensilsCrossed color={MUTED} size={28} />
                    <Text style={styles.emptyTitle}>
                      {menuFilter !== 'all'
                        ? 'No dishes for this filter'
                        : 'No dishes found'}
                    </Text>
                    <Text style={styles.emptySub}>
                      {menuFilter !== 'all'
                        ? 'Try another filter, or clear filters to see the full menu.'
                        : 'This restaurant has not added menu items yet.'}
                    </Text>
                    {menuFilter !== 'all' ? (
                      <Pressable
                        style={styles.clearSearchBtn}
                        onPress={() => applyMenuFilter('all')}
                      >
                        <Text style={styles.clearSearchBtnText}>Clear filters</Text>
                      </Pressable>
                    ) : null}
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
                          unavailable={unavailableSet.has(item.id)}
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
          <View>
            {ratingsHistogram.data && (ratingsHistogram.data.totalRatings ?? 0) > 0 && (
              <View style={styles.histogramWrap}>
                <Text style={styles.histogramTitle}>Ratings breakdown</Text>
                <View style={styles.histogramScoreRow}>
                  <Text style={styles.histogramScore}>
                    {typeof ratingsHistogram.data.avgRating === 'number'
                      ? ratingsHistogram.data.avgRating.toFixed(1)
                      : '—'}
                  </Text>
                  <View>
                    <View style={styles.histogramStarRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          color="#F59E0B"
                          fill={
                            s <= Math.round(ratingsHistogram.data?.avgRating ?? 0)
                              ? '#F59E0B'
                              : 'transparent'
                          }
                        />
                      ))}
                    </View>
                    <Text style={styles.histogramTotal}>
                      {ratingsHistogram.data.totalRatings} ratings
                    </Text>
                  </View>
                </View>
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = ratingsHistogram.data?.breakdown?.[star] ?? 0;
                  const total = ratingsHistogram.data?.totalRatings ?? 0;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <View key={star} style={styles.histogramRow}>
                      <Text style={styles.histogramStar}>{star}★</Text>
                      <View style={styles.histogramBarBg}>
                        <View style={[styles.histogramBar, { width: `${pct}%` as `${number}%` }]} />
                      </View>
                      <Text style={styles.histogramCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            <RestaurantReviewsPanel restaurantId={id} />
          </View>
        ) : null}

        {tab === 'Info' ? (
          <View style={styles.panelPad}>
            <Text style={styles.infoLabel}>About</Text>
            <Text style={styles.infoBody}>
              {r.description ||
                `${restaurantName} serves ${cuisineLine.toLowerCase()}. Order fresh favourites with live tracking.`}
            </Text>

            {(r.cuisines?.length || 0) > 0 ? (
              <>
                <Text style={[styles.infoLabel, { marginTop: 18 }]}>Cuisines</Text>
                <View style={styles.infoChips}>
                  {r.cuisines!.slice(0, 8).map((c) => (
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
  pendingPill: {
    backgroundColor: 'rgba(148,163,184,0.9)',
  },
  pendingText: {
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
  heroFallback: {
    backgroundColor: '#1E293B',
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
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statPillText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: '#FFF',
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
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterBtnOn: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  filterRail: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipOn: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  filterChipText: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#475569',
  },
  filterChipTextOn: {
    color: '#FFFFFF',
    fontFamily: fonts.uiBold,
  },
  suggestBlock: {
    marginTop: 6,
    marginBottom: 2,
    gap: 6,
  },
  suggestLabel: {
    marginHorizontal: 18,
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  suggestRail: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  suggestChip: {
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestChipText: {
    flexShrink: 1,
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: INK,
  },
  suggestPrice: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: ORANGE,
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
  popularImageFallback: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
  histogramWrap: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  histogramTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
    marginBottom: 14,
  },
  histogramScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  histogramScore: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    color: INK,
    lineHeight: 44,
  },
  histogramStarRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  histogramTotal: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  histogramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  histogramStar: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: MUTED,
    width: 24,
  },
  histogramBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  histogramBar: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  histogramCount: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    color: MUTED,
    width: 28,
    textAlign: 'right',
  },
});
