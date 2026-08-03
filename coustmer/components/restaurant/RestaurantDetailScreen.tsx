import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  Flame,
  MapPin,
  Search,
  Sparkles,
  Star,
  Tag,
  UtensilsCrossed,
  X,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
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
  useFullMenu,
  useRestaurant,
  useRestaurantOffers,
} from '@/lib/restaurant/hooks';
import type { MenuItem } from '@/lib/restaurant/types';
import { useRestaurantReviewStats } from '@/lib/review/hooks';

const ORANGE = '#F97316';
const INK = '#0B1220';
const MUTED = '#64748B';
const SCREEN_W = Dimensions.get('window').width;
const POPULAR_CARD_W = SCREEN_W * 0.58;

type TabId = 'Menu' | 'Reviews' | 'Info' | 'Offers';

function isBestseller(item: MenuItem, index: number) {
  const tags = (item.tags ?? []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => t.includes('best') || t.includes('popular') || t.includes('hit'))) {
    return true;
  }
  return index < 6 && (item.rating ?? 0) >= 4.2;
}

export function RestaurantDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ restaurantId: string }>();
  const id = Array.isArray(params.restaurantId)
    ? params.restaurantId[0]
    : params.restaurantId;

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const menuOffsetY = useRef(0);

  const [tab, setTab] = useState<TabId>('Menu');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('popular');
  const [stickyCats, setStickyCats] = useState(false);

  const restaurant = useRestaurant(id);
  const reviewStats = useRestaurantReviewStats(id, {
    enabled: Boolean(id),
  });
  const menu = useFullMenu(id, {
    name: restaurant.data?.name,
    cuisines: restaurant.data?.cuisines,
  });
  const offers = useRestaurantOffers(id);

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

  const needle = query.trim().toLowerCase();
  const isSearching = needle.length > 0;

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

  const popularItems = useMemo(() => {
    const scored = [...menu.items].sort((a, b) => {
      const ar = a.rating ?? 0;
      const br = b.rating ?? 0;
      if (br !== ar) return br - ar;
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    });
    const picks = scored.filter((_, i) => isBestseller(scored[i], i)).slice(0, 8);
    return picks.length >= 3 ? picks : menu.items.slice(0, 8);
  }, [menu.items]);

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return menu.items.filter((item) => matchesQuery(item, needle));
  }, [isSearching, menu.items, needle]);

  const categories = useMemo(() => {
    if (menu.categories.length) return menu.categories;
    const names = new Map<string, string>();
    for (const item of menu.items) {
      const name = item.categoryName || 'Menu';
      const cid = item.categoryId || name;
      if (!names.has(cid)) names.set(cid, name);
    }
    return [...names.entries()].map(([cid, name]) => ({ id: cid, name }));
  }, [menu.categories, menu.items]);

  const grouped = useMemo(() => {
    if (isSearching) return [];

    if (!categories.length) {
      return menu.items.length
        ? [{ id: 'all', name: 'Full menu', items: menu.items }]
        : [];
    }

    const byCat = categories.map((cat) => ({
      ...cat,
      items: menu.items.filter((item) => {
        if (item.categoryId && item.categoryId === cat.id) return true;
        if (item.categoryName && item.categoryName === cat.name) return true;
        return false;
      }),
    }));

    const used = new Set(byCat.flatMap((c) => c.items.map((i) => i.id)));
    const leftover = menu.items.filter((i) => !used.has(i.id));
    if (leftover.length) {
      if (byCat.length === 0) {
        return [{ id: 'all', name: 'Full menu', items: leftover }];
      }
      byCat[0] = { ...byCat[0], items: [...byCat[0].items, ...leftover] };
    }

    const filled = byCat.filter((c) => c.items.length > 0);
    if (filled.length) return filled;

    return menu.items.length
      ? [{ id: 'all', name: 'Full menu', items: menu.items }]
      : [];
  }, [categories, menu.items, isSearching]);

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
  const ratingText =
    reviewStats.data && reviewStats.data.average > 0
      ? reviewStats.data.average.toFixed(1)
      : typeof r.rating === 'number' && r.rating > 0
        ? r.rating.toFixed(1)
        : '—';
  const reviewsCount =
    reviewStats.data && reviewStats.data.total > 0
      ? `${reviewStats.data.total}`
      : typeof r.reviewCount === 'number' && r.reviewCount > 0
        ? `${r.reviewCount}`
        : 'New';
  const locationText = r.address || r.city || 'Near you';
  const eta = r.deliveryTime || '25–35 min';
  const cuisineLine = (r.cuisines || []).slice(0, 3).join(' · ') || 'Multi cuisine';

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

              {/* ETA sits top-right on the hero */}
              <View style={styles.etaPill}>
                <Clock color={INK} size={11} strokeWidth={2.6} />
                <Text style={styles.etaText}>{eta}</Text>
              </View>
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
              {/* Open / Closed sits with rating row — separate from ETA */}
              {r.isOpen === false ? (
                <View style={[styles.statusPill, styles.closedPill]}>
                  <Text style={styles.closedText}>Closed</Text>
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
            placeholder="Search dishes on this menu…"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
            blurOnSubmit={false}
          />
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
                        <Text style={styles.sectionTitle}>Popular picks</Text>
                      </View>
                      <Text style={styles.sectionSub}>
                        Crowd favourites — tap to customise
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
            <Text style={[styles.infoLabel, { marginTop: 18 }]}>Address</Text>
            <Text style={styles.infoBody}>{locationText}</Text>
            {typeof r.priceForTwo === 'number' || typeof r.costForTwo === 'number' ? (
              <>
                <Text style={[styles.infoLabel, { marginTop: 18 }]}>
                  Cost for two
                </Text>
                <Text style={styles.infoBody}>
                  ₹{r.costForTwo ?? r.priceForTwo}
                </Text>
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
