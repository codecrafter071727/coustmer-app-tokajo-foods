import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  Star,
  Store,
} from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyView, ErrorView } from '@/components/common/StateViews';
import { VegBadge } from '@/components/restaurant/MenuBadges';
import { APP_BOTTOM_NAV_INSET } from '@/components/navigation/AppBottomNav';
import { CartFloatingBar } from '@/components/order/CartFloatingBar';
import { fonts } from '@/constants/typography';
import { resolveMenuItemImage } from '@/lib/restaurant/menu-item-images';
import {
  extractCityFromAddress,
  normalizeCityName,
} from '@/lib/location/format';
import {
  type CategoryDish,
  useCategoryDishes,
} from '@/lib/restaurant/hooks';
import {
  useDeliveryLocationStore,
} from '@/store/delivery-location-store';

function titleFromSlug(slug: string) {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CategoryExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    slug?: string;
    cuisine?: string;
    label?: string;
  }>();
  const slugRaw = params.slug ?? params.cuisine ?? '';
  const slug = Array.isArray(slugRaw) ? slugRaw[0] : slugRaw;
  const labelParam = Array.isArray(params.label)
    ? params.label[0]
    : params.label;
  const title = labelParam?.trim() || titleFromSlug(slug) || 'Category';

  const deliveryLocation = useDeliveryLocationStore((s) => s.location);
  const city = useMemo(() => {
    const raw =
      deliveryLocation?.city ||
      (deliveryLocation?.formattedAddress
        ? extractCityFromAddress(deliveryLocation.formattedAddress)
        : null);
    return normalizeCityName(raw);
  }, [deliveryLocation]);
  const lat = deliveryLocation?.lat ?? null;
  const lng = deliveryLocation?.lng ?? null;

  const dishesQuery = useCategoryDishes({
    cuisine: slug,
    city,
    lat: typeof lat === 'number' ? lat : null,
    lng: typeof lng === 'number' ? lng : null,
    enabled: Boolean(slug) && slug !== 'popular',
  });

  const dishes = dishesQuery.data ?? [];

  const openDish = (dish: CategoryDish) => {
    router.push({
      pathname: '/restaurants/[restaurantId]',
      params: {
        restaurantId: dish.restaurantId,
        category: slug,
        itemId: dish.id,
      },
    });
  };

  const openRestaurant = (restaurantId: string) => {
    router.push({
      pathname: '/restaurants/[restaurantId]',
      params: {
        restaurantId,
        category: slug,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/home');
          }}
          hitSlop={8}
        >
          <ChevronLeft color="#0B1220" size={24} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {dishesQuery.isLoading
              ? 'Finding dishes near you…'
              : `${dishes.length} item${dishes.length === 1 ? '' : 's'} near you`}
          </Text>
        </View>
      </View>

      {dishesQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#F97316" size="large" />
          <Text style={styles.loadingText}>Loading {title.toLowerCase()}…</Text>
        </View>
      ) : dishesQuery.isError ? (
        <ErrorView
          message={
            dishesQuery.error instanceof Error
              ? dishesQuery.error.message
              : 'Could not load dishes'
          }
          onRetry={() => dishesQuery.refetch()}
        />
      ) : dishes.length === 0 ? (
        <EmptyView
          title={`No ${title} items yet`}
          subtitle="Try another category or check back soon."
        />
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={(item) => `${item.restaurantId}:${item.id}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => openDish(item)}>
              <View style={styles.imageWrap}>
                <Image
                  source={{
                    uri: resolveMenuItemImage(item.name, item.imageUrl),
                  }}
                  style={styles.image}
                  contentFit="cover"
                />
                {item.isBestSeller ? (
                  <View style={styles.bestBadge}>
                    <Text style={styles.bestText}>Bestseller</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.body}>
                <View style={styles.nameRow}>
                  <Text style={styles.dishName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <VegBadge isVeg={item.isVeg} />
                </View>

                <Text style={styles.price}>₹{item.price}</Text>

                {item.description ? (
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                <Pressable
                  style={styles.restaurantRow}
                  onPress={() => openRestaurant(item.restaurantId)}
                >
                  <Store color="#F97316" size={14} strokeWidth={2.4} />
                  <Text style={styles.restaurantName} numberOfLines={1}>
                    {item.restaurantName}
                  </Text>
                  {typeof item.rating === 'number' && item.rating > 0 ? (
                    <>
                      <Star color="#F59E0B" fill="#F59E0B" size={12} />
                      <Text style={styles.meta}>{item.rating.toFixed(1)}</Text>
                    </>
                  ) : null}
                  {item.deliveryTime ? (
                    <>
                      <Clock color="#64748B" size={12} />
                      <Text style={styles.meta}>{item.deliveryTime}</Text>
                    </>
                  ) : null}
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}

      <CartFloatingBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerCopy: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: '#0B1220',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#64748B',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: '#64748B',
  },
  list: {
    padding: 16,
    paddingBottom: APP_BOTTOM_NAV_INSET + 88,
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  imageWrap: {
    width: 112,
    height: 128,
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bestBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bestText: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: '#EA580C',
  },
  body: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dishName: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: '#0B1220',
  },
  price: {
    marginTop: 6,
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: '#0B1220',
  },
  desc: {
    marginTop: 4,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  restaurantRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  restaurantName: {
    maxWidth: '48%',
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#F97316',
  },
  meta: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    color: '#64748B',
  },
});
