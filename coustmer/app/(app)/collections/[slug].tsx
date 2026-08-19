import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCollectionRestaurants } from '@/lib/customer/hooks';
import { fonts } from '@/constants/typography';
import { authTheme } from '@/constants/auth-theme';
import type { RestaurantCard } from '@/lib/customer/types';
import { APP_BOTTOM_NAV_INSET } from '@/components/navigation/AppBottomNav';

export default function CollectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useCollectionRestaurants(slug ?? '');

  const restaurants: RestaurantCard[] = data?.restaurants ?? [];
  const collection = data?.collection;

  function renderCard({ item }: { item: RestaurantCard }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() =>
          router.push({
            pathname: '/restaurants/[restaurantId]',
            params: { restaurantId: item.id },
          })
        }
      >
        <View style={styles.cardImgWrap}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.cardImg}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.cardImg, styles.cardImgFallback]} />
          )}
          {typeof item.offer === 'string' && item.offer.length > 0 && (
            <View style={styles.offerBadge}>
              <Text style={styles.offerText}>{item.offer}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          {Array.isArray(item.cuisines) && item.cuisines.length > 0 && (
            <Text style={styles.cardCuisine} numberOfLines={1}>
              {item.cuisines.slice(0, 3).join(' · ')}
            </Text>
          )}
          <View style={styles.cardMeta}>
            {typeof item.rating === 'number' && item.rating > 0 && (
              <View style={styles.ratingPill}>
                <Text style={styles.ratingText}>★ {item.rating.toFixed(1)}</Text>
              </View>
            )}
            {item.deliveryTime && (
              <Text style={styles.metaText}>{item.deliveryTime}</Text>
            )}
            {item.priceForTwo != null && (
              <Text style={styles.metaText}>₹{item.priceForTwo} for two</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color="#0B1220" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText} numberOfLines={1}>
            {collection?.title ?? 'Collection'}
          </Text>
          {restaurants.length > 0 && (
            <Text style={styles.headerCount}>{restaurants.length} restaurants</Text>
          )}
        </View>
      </View>

      {/* Hero banner if collection has image */}
      {collection?.imageUrl && (
        <View style={styles.hero}>
          <Image
            source={{ uri: collection.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={StyleSheet.absoluteFill}
          />
          {collection.description && (
            <Text style={styles.heroCopy} numberOfLines={2}>
              {collection.description}
            </Text>
          )}
        </View>
      )}

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={authTheme.brand} />
        </View>
      )}

      {isError && !isLoading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load restaurants.</Text>
          <TouchableOpacity onPress={() => void refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={restaurants}
          keyExtractor={(r) => r.id}
          renderItem={renderCard}
          numColumns={1}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24 + APP_BOTTOM_NAV_INSET,
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No restaurants in this collection yet.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { flex: 1 },
  headerText: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: '#0B1220',
    letterSpacing: -0.3,
  },
  headerCount: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  hero: {
    height: 120,
    backgroundColor: '#E5E7EB',
    justifyContent: 'flex-end',
    padding: 16,
  },
  heroCopy: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F3F5',
    elevation: 1,
  },
  cardImgWrap: { width: 100, height: 92, position: 'relative' },
  cardImg: { width: 100, height: 92 },
  cardImgFallback: { backgroundColor: '#E5E7EB' },
  offerBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#F97316',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offerText: {
    fontFamily: fonts.uiBold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cardInfo: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cardName: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: '#0B1220',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  cardCuisine: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  ratingPill: {
    backgroundColor: '#16A34A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: { fontFamily: fonts.uiBold, fontSize: 11, color: '#FFFFFF' },
  metaText: { fontFamily: fonts.ui, fontSize: 11, color: '#6B7280' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorText: { fontFamily: fonts.uiSemi, fontSize: 14, color: '#EF4444', marginBottom: 12 },
  retryBtn: {
    backgroundColor: authTheme.brand,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { fontFamily: fonts.uiBold, fontSize: 14, color: '#FFFFFF' },
  emptyText: { fontFamily: fonts.ui, fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
