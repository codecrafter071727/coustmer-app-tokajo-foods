import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronDown,
  Heart,
  SlidersHorizontal,
  UtensilsCrossed,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EmptyView,
  ErrorView,
  LoadingView,
} from '@/components/common/StateViews';
import { SmoothPressable } from '@/components/common/SmoothPressable';
import {
  ExploreRestaurantCard,
} from '@/components/home/ExploreRestaurantCard';
import { CustomerServiceStatus } from '@/components/customer/CustomerServiceStatus';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import type { FavouriteDish, RestaurantCard } from '@/lib/customer/types';
import {
  useFavouriteDishes,
  useFavorites,
  useRemoveFavouriteDish,
} from '@/lib/customer/hooks';
import { useFavoriteToggle } from '@/lib/customer/useFavoriteToggle';
import type { Restaurant } from '@/lib/restaurant/types';
import { useFavoritesStore } from '@/store/favorites-store';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(SCREEN_H * 0.45);

/** User-provided food images from public/(1)(2)(3) */
const HERO_FOOD = {
  left: require('@/assets/images/favorites/hero-1.png'),
  top: require('@/assets/images/favorites/hero-2.png'),
  right: require('@/assets/images/favorites/hero-3.png'),
};

const FILTERS = [
  { id: 'filter', label: 'Filter', icon: 'sliders' as const },
  { id: 'sort', label: 'Sort by', chevron: true },
  { id: 'fast', label: 'Fast Delivery' },
  { id: 'rating', label: 'Ratings 4.0+' },
];

function toRestaurant(card: RestaurantCard): Restaurant {
  return {
    id: String(card.id ?? (card as Record<string, unknown>)._id ?? ''),
    name: card.name || 'Restaurant',
    imageUrl: card.imageUrl,
    coverUrl: (card.coverUrl as string | undefined) || card.imageUrl,
    logoUrl: card.logoUrl as string | undefined,
    rating: card.rating,
    reviewCount: card.reviewCount as number | undefined,
    cuisines: card.cuisines,
    deliveryTime: card.deliveryTime,
    priceForTwo: card.priceForTwo,
    offer: card.offer as string | undefined,
    address: card.address as string | undefined,
    city: card.city as string | undefined,
    distance: card.distance as number | undefined,
  };
}

function ConfettiBits() {
  const bits: {
    top: number;
    left?: number;
    right?: number;
    rotate: string;
    w: number;
  }[] = [
    { top: 88, left: 36, rotate: '25deg', w: 10 },
    { top: 108, right: 48, rotate: '-18deg', w: 12 },
    { top: 168, left: 24, rotate: '40deg', w: 8 },
    { top: 196, right: 28, rotate: '12deg', w: 11 },
    { top: 72, right: 130, rotate: '-30deg', w: 9 },
    { top: 220, left: 90, rotate: '18deg', w: 9 },
  ];
  return (
    <>
      {bits.map((b, i) => (
        <View
          key={i}
          style={[
            styles.confetti,
            {
              top: b.top,
              left: b.left,
              right: b.right,
              width: b.w,
              transform: [{ rotate: b.rotate }],
            },
          ]}
        />
      ))}
    </>
  );
}

type Tab = 'restaurants' | 'dishes';

function DishCard({
  dish,
  onRemove,
  removing,
}: {
  dish: FavouriteDish;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <View style={dishStyles.card}>
      <View style={dishStyles.imgWrap}>
        {dish.imageUrl ? (
          <Image source={{ uri: dish.imageUrl }} style={dishStyles.img} contentFit="cover" />
        ) : (
          <View style={[dishStyles.img, dishStyles.imgFallback]}>
            <UtensilsCrossed size={24} color="#D1D5DB" strokeWidth={1.5} />
          </View>
        )}
        {dish.isVeg !== undefined && (
          <View style={[dishStyles.vegDot, { borderColor: dish.isVeg ? '#16A34A' : '#DC2626' }]}>
            <View style={[dishStyles.vegInner, { backgroundColor: dish.isVeg ? '#16A34A' : '#DC2626' }]} />
          </View>
        )}
      </View>
      <View style={dishStyles.info}>
        <Text style={dishStyles.name} numberOfLines={1}>{dish.name}</Text>
        {dish.restaurantName && (
          <Text style={dishStyles.resto} numberOfLines={1}>{dish.restaurantName}</Text>
        )}
        <View style={dishStyles.meta}>
          {dish.price != null && (
            <Text style={dishStyles.price}>₹{dish.price}</Text>
          )}
          {typeof dish.rating === 'number' && dish.rating > 0 && (
            <View style={dishStyles.ratingPill}>
              <Text style={dishStyles.ratingText}>★ {dish.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        disabled={removing}
        style={dishStyles.heartBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {removing ? (
          <ActivityIndicator size="small" color="#F43F5E" />
        ) : (
          <Heart size={20} color="#F43F5E" fill="#F43F5E" strokeWidth={2} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const dishStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    elevation: 1,
  },
  imgWrap: { position: 'relative', marginRight: 12 },
  img: { width: 72, height: 72, borderRadius: 12 },
  imgFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  vegDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegInner: { width: 7, height: 7, borderRadius: 3.5 },
  info: { flex: 1 },
  name: { fontFamily: fonts.displayBold, fontSize: 15, color: '#0B1220', letterSpacing: -0.2, marginBottom: 2 },
  resto: { fontFamily: fonts.ui, fontSize: 12, color: '#6B7280', marginBottom: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontFamily: fonts.uiBold, fontSize: 13, color: '#374151' },
  ratingPill: { backgroundColor: '#16A34A', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  ratingText: { fontFamily: fonts.uiBold, fontSize: 10, color: '#FFFFFF' },
  heartBtn: { padding: 6 },
});

export function FavouritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('restaurants');
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useFavorites();
  const { data: dishes, isLoading: dishesLoading, refetch: dishesRefetch, isRefetching: dishesRefetching } =
    useFavouriteDishes();
  const removeDishMutation = useRemoveFavouriteDish();
  const { favoriteIds, toggleFavorite, pendingId } = useFavoriteToggle();
  const localById = useFavoritesStore((s) => s.byId);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const restaurants = useMemo(() => {
    const map = new Map<string, Restaurant>();

    for (const card of data ?? []) {
      const r = toRestaurant(card);
      if (r.id) map.set(r.id, r);
    }

    for (const id of favoriteIds) {
      if (map.has(id)) continue;
      const local = localById[id];
      if (local) map.set(id, toRestaurant(local));
    }

    // Preserve newest-first order from local favoriteIds
    let list = favoriteIds
      .map((id) => map.get(id))
      .filter((r): r is Restaurant => Boolean(r));

    // Fallback: if ids somehow empty but API returned rows
    if (!list.length && (data?.length ?? 0) > 0) {
      list = (data ?? []).map(toRestaurant).filter((r) => r.id);
    }

    if (activeFilter === 'rating') {
      return list.filter((r) => (r.rating ?? 0) >= 4);
    }
    if (activeFilter === 'fast') {
      return [...list].sort((a, b) => {
        const ta = parseInt(String(a.deliveryTime ?? '40'), 10) || 40;
        const tb = parseInt(String(b.deliveryTime ?? '40'), 10) || 40;
        return ta - tb;
      });
    }
    if (activeFilter === 'sort') {
      return [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return list;
  }, [data, activeFilter, favoriteIds, localById]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  const openRestaurant = (id: string) => {
    router.push(`/restaurants/${id}` as import('expo-router').Href);
  };

  const heroBlock = (
    <View style={[styles.hero, { height: HERO_HEIGHT }]}>
      <LinearGradient
        colors={['#FF9800', '#FFC107', '#FFEB3B']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0.85 }}
        end={{ x: 1, y: 0.1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,152,0,0.4)', 'rgba(255,152,0,0.1)', 'transparent']}
        locations={[0, 0.35, 0.72]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.85, y: 0 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ConfettiBits />
      <Image source={HERO_FOOD.top} style={styles.food2} contentFit="contain" />
      <Image source={HERO_FOOD.right} style={styles.food3} contentFit="contain" />
      <Image source={HERO_FOOD.left} style={styles.food1} contentFit="contain" />
      <SmoothPressable
        onPress={goBack}
        style={[styles.backBtn, { top: insets.top + 8 }]}
        pressScale={0.92}
        hitSlop={8}
      >
        <ArrowLeft color="#FFFFFF" size={20} strokeWidth={2.4} />
      </SmoothPressable>
      <View style={[styles.heroCopy, { paddingBottom: 28 }]}>
        <Text style={styles.heroTitle}>We know you love it!</Text>
        <Text style={styles.heroSub}>
          Browse your favourite restaurants & feast like never before.
        </Text>
      </View>
    </View>
  );

  const tabBar = (
    <View style={styles.tabBar}>
      {(['restaurants', 'dishes'] as Tab[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          onPress={() => setActiveTab(tab)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
            {tab === 'restaurants' ? 'Restaurants' : 'Dishes'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const listHeader = (
    <View>
      {heroBlock}
      {tabBar}
      {activeTab === 'restaurants' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const on = activeFilter === f.id;
            return (
              <Pressable
                key={f.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() =>
                  setActiveFilter((prev) => (prev === f.id ? null : f.id))
                }
              >
                {f.icon === 'sliders' ? (
                  <SlidersHorizontal color="#3E4152" size={13} strokeWidth={2.4} />
                ) : null}
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
                {f.chevron ? (
                  <ChevronDown color="#686B78" size={14} strokeWidth={2.4} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <CustomerServiceStatus />
    </View>
  );

  const listFooter = (
    <View style={styles.liveWrap}>
      <Text style={styles.liveText}>Live it up!</Text>
    </View>
  );

  if (isLoading && !data && favoriteIds.length === 0) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <LoadingView label="Loading favourites…" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {listHeader}
        <ErrorView
          message={error instanceof Error ? error.message : 'Failed to load favourites'}
          onRetry={refetch}
        />
      </View>
    );
  }

  if (activeTab === 'dishes') {
    return (
      <View style={styles.root}>
        <FlatList
          data={dishes ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListFooterComponent={(dishes?.length ?? 0) > 0 ? listFooter : null}
          ListEmptyComponent={
            dishesLoading ? (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <ActivityIndicator size="large" color={authTheme.brand} />
              </View>
            ) : (
              <EmptyView
                icon={<UtensilsCrossed color="#C4C4C8" size={40} />}
                title="No favourite dishes yet"
                subtitle="Heart a dish on a restaurant menu to save it here."
              />
            )
          }
          contentContainerStyle={[styles.list, { paddingBottom: 28 + Math.max(insets.bottom, 12) }]}
          showsVerticalScrollIndicator={false}
          onRefresh={dishesRefetch}
          refreshing={dishesRefetching}
          renderItem={({ item }) => (
            <DishCard
              dish={item}
              removing={removeDishMutation.isPending && removeDishMutation.variables === item.id}
              onRemove={() => removeDishMutation.mutate(item.id)}
            />
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListFooterComponent={restaurants.length ? listFooter : null}
        ListEmptyComponent={
          <EmptyView
            icon={<Heart color="#C4C4C8" size={40} />}
            title="No favourites yet"
            subtitle="Tap the heart on a restaurant to save it here."
          />
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 28 + Math.max(insets.bottom, 12) },
        ]}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) => (
          <ExploreRestaurantCard
            restaurant={item}
            isFavorite
            favoriteLoading={pendingId === item.id}
            onToggleFavorite={() => toggleFavorite(item.id, { restaurant: item })}
            onPress={() => openRestaurant(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    flexGrow: 1,
  },
  hero: {
    overflow: 'hidden',
    paddingHorizontal: 18,
    justifyContent: 'flex-end',
  },
  backBtn: {
    position: 'absolute',
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  heroCopy: {
    maxWidth: '75%',
    zIndex: 4,
    gap: 10,
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 44,
    fontWeight: '800',
  },
  heroSub: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 20,
  },
  food2: {
    // (2) — very top right
    position: 'absolute',
    top: -10,
    right: -30,
    width: SCREEN_H * 0.24,
    height: SCREEN_H * 0.24,
    zIndex: 3,
    transform: [{ rotate: '6deg' }],
  },
  food3: {
    // (3) — down and smaller
    position: 'absolute',
    top: '55%',
    right: -10,
    width: SCREEN_H * 0.18,
    height: SCREEN_H * 0.18,
    zIndex: 4,
  },
  food1: {
    // (1) — left and up, smaller
    position: 'absolute',
    top: 20,
    left: 24,
    width: SCREEN_H * 0.16,
    height: SCREEN_H * 0.16,
    zIndex: 2,
    transform: [{ rotate: '-6deg' }],
  },
  confetti: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F6D365',
    opacity: 0.9,
    zIndex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#0B1220',
  },
  tabLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
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
  chipOn: {
    borderColor: '#AC0F45',
    backgroundColor: 'rgba(255, 90, 65, 0.08)',
  },
  chipText: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: '#3E4152',
  },
  chipTextOn: {
    color: '#AC0F45',
  },
  liveWrap: {
    paddingTop: 28,
    paddingBottom: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  liveText: {
    fontFamily: fonts.displayBold,
    fontSize: 64,
    color: '#E8E8EC',
    letterSpacing: -1.5,
    lineHeight: 68,
  },
});
