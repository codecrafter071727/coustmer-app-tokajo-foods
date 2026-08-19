import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  Search,
  Star,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts } from '@/constants/typography';
import {
  useDebouncedValue,
  useSearchCombined,
  useSearchSuggestions,
} from '@/lib/search/hooks';
import {
  clearLocalRecentSearches,
  loadLocalRecentSearches,
  pushLocalRecentSearch,
  removeLocalRecentSearch,
} from '@/lib/search/recent';
import type { SearchDish, SearchRestaurant, SearchSuggestion } from '@/lib/search/types';
import { useDeliveryCoords } from '@/store/delivery-location-store';

const ORANGE = '#F97316';
const INK = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#F1F5F9';
const BG = '#FFFFFF';

export function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const coords = useDeliveryCoords();

  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 250);

  const suggestions = useSearchSuggestions(
    { q: debouncedQuery, limit: 8 },
    { enabled: !submitted && debouncedQuery.length >= 1 }
  );

  const combined = useSearchCombined(
    {
      q: debouncedQuery,
      lat: coords?.lat,
      lng: coords?.lng,
    },
    { enabled: submitted && debouncedQuery.length >= 1 }
  );

  useEffect(() => {
    loadLocalRecentSearches().then(setRecentSearches);
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const performSearch = useCallback((term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    setQuery(cleaned);
    setSubmitted(true);
    Keyboard.dismiss();
    pushLocalRecentSearch(cleaned).then(setRecentSearches);
  }, []);

  const clearRecents = useCallback(() => {
    clearLocalRecentSearches().then(() => setRecentSearches([]));
  }, []);

  const removeRecent = useCallback((term: string) => {
    removeLocalRecentSearch(term).then(setRecentSearches);
  }, []);

  const openRestaurant = (id: string) => {
    router.push({ pathname: '/restaurants/[restaurantId]', params: { restaurantId: id } });
  };

  const showingResults = submitted && debouncedQuery.length >= 1;
  const showingSuggestions = !submitted && debouncedQuery.length >= 1;
  const showingRecents = !submitted && debouncedQuery.length === 0 && recentSearches.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={INK} size={22} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.inputWrap}>
          <Search color={MUTED} size={16} strokeWidth={2.5} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search restaurants, dishes…"
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setSubmitted(false);
            }}
            onSubmitEditing={() => performSearch(query)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => { setQuery(''); setSubmitted(false); }}
              hitSlop={10}
            >
              <X color={MUTED} size={16} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Recent searches */}
      {showingRecents && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent searches</Text>
            <Pressable onPress={clearRecents}>
              <Text style={styles.clearBtn}>Clear all</Text>
            </Pressable>
          </View>
          {recentSearches.map((term) => (
            <Pressable
              key={term}
              style={styles.recentRow}
              onPress={() => performSearch(term)}
            >
              <Clock color={MUTED} size={14} strokeWidth={2} />
              <Text style={styles.recentText}>{term}</Text>
              <Pressable
                onPress={() => removeRecent(term)}
                hitSlop={8}
                style={styles.recentRemove}
              >
                <X color={MUTED} size={12} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      {/* Suggestions (autocomplete) */}
      {showingSuggestions && (suggestions.data?.suggestions?.length ?? 0) > 0 && (
        <FlatList
          data={suggestions.data!.suggestions}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          style={styles.suggestionsList}
          renderItem={({ item }) => (
            <SuggestionRow item={item} onPress={performSearch} />
          )}
        />
      )}

      {/* Results */}
      {showingResults && (
        <>
          {combined.isLoading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={ORANGE} size="small" />
              <Text style={styles.loadingText}>Searching…</Text>
            </View>
          )}

          {combined.data && (
            <FlatList
              data={[
                ...(combined.data.restaurants.length > 0
                  ? [{ type: 'header' as const, label: 'Restaurants' }]
                  : []),
                ...combined.data.restaurants.map((r) => ({ type: 'restaurant' as const, data: r })),
                ...(combined.data.dishes.length > 0
                  ? [{ type: 'header' as const, label: 'Dishes' }]
                  : []),
                ...combined.data.dishes.map((d) => ({ type: 'dish' as const, data: d })),
              ]}
              keyExtractor={(item, i) =>
                item.type === 'header' ? `h-${item.label}` : `${item.type}-${(item as { data: { id: string } }).data.id}-${i}`
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.resultsList}
              ListEmptyComponent={
                !combined.isLoading ? (
                  <View style={styles.emptyWrap}>
                    <Search color={MUTED} size={40} strokeWidth={1.5} />
                    <Text style={styles.emptyText}>No results for "{query}"</Text>
                    <Text style={styles.emptySubtext}>Try a different spelling or keyword</Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                if (item.type === 'header') {
                  return (
                    <Text style={styles.resultSectionHeader}>{item.label}</Text>
                  );
                }
                if (item.type === 'restaurant') {
                  return (
                    <RestaurantRow
                      restaurant={item.data}
                      onPress={() => openRestaurant(item.data.id)}
                    />
                  );
                }
                return (
                  <DishRow
                    dish={item.data}
                    onPress={() => openRestaurant(item.data.restaurantId)}
                  />
                );
              }}
            />
          )}

          {combined.data &&
            combined.data.restaurants.length === 0 &&
            combined.data.dishes.length === 0 &&
            !combined.isLoading && (
              <View style={styles.emptyWrap}>
                <Search color={MUTED} size={40} strokeWidth={1.5} />
                <Text style={styles.emptyText}>No results for "{query}"</Text>
                <Text style={styles.emptySubtext}>Try a different spelling or keyword</Text>
              </View>
            )}
        </>
      )}

      {/* Empty state when nothing to show */}
      {!showingRecents && !showingSuggestions && !showingResults && (
        <View style={styles.idleWrap}>
          <TrendingUp color={ORANGE} size={36} strokeWidth={1.8} />
          <Text style={styles.idleText}>Search for your favourite food</Text>
          <Text style={styles.idleSubtext}>
            Restaurants, dishes, cuisines — find anything
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function SuggestionRow({
  item,
  onPress,
}: {
  item: SearchSuggestion;
  onPress: (text: string) => void;
}) {
  return (
    <Pressable style={styles.suggestionRow} onPress={() => onPress(item.text)}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.suggestionImg} contentFit="cover" />
      ) : (
        <View style={styles.suggestionIcon}>
          <Search color={MUTED} size={13} />
        </View>
      )}
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionText} numberOfLines={1}>{item.text}</Text>
        {item.type && item.type !== 'query' && (
          <Text style={styles.suggestionType}>{item.type}</Text>
        )}
      </View>
    </Pressable>
  );
}

function RestaurantRow({
  restaurant,
  onPress,
}: {
  restaurant: SearchRestaurant;
  onPress: () => void;
}) {
  const cover = restaurant.imageUrl || restaurant.coverUrl;
  return (
    <Pressable style={styles.resultCard} onPress={onPress}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.resultImage} contentFit="cover" />
      ) : (
        <View style={[styles.resultImage, styles.resultImageFallback]}>
          <Text style={styles.resultFallbackLetter}>{restaurant.name?.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {restaurant.cuisines?.slice(0, 3).join(', ')}
        </Text>
        <View style={styles.resultMetaRow}>
          {restaurant.rating ? (
            <View style={styles.ratingChip}>
              <Star color="#FFF" fill="#FFF" size={9} />
              <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
            </View>
          ) : null}
          {restaurant.deliveryTime && (
            <Text style={styles.resultMetaText}>{restaurant.deliveryTime}</Text>
          )}
          {restaurant.priceForTwo ? (
            <Text style={styles.resultMetaText}>₹{restaurant.priceForTwo} for two</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function DishRow({
  dish,
  onPress,
}: {
  dish: SearchDish;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.resultCard} onPress={onPress}>
      {dish.imageUrl ? (
        <Image source={{ uri: dish.imageUrl }} style={styles.resultImage} contentFit="cover" />
      ) : (
        <View style={[styles.resultImage, styles.resultImageFallback]}>
          <Text style={styles.resultFallbackLetter}>{dish.name?.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.resultInfo}>
        <View style={styles.dishNameRow}>
          {dish.isVeg !== undefined && (
            <View style={[styles.vegDot, !dish.isVeg && styles.nonVegDot]} />
          )}
          <Text style={styles.resultName} numberOfLines={1}>{dish.name}</Text>
        </View>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {dish.restaurantName || 'Restaurant'}
        </Text>
        <Text style={styles.dishPrice}>₹{dish.price}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { padding: 6 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 15,
    color: INK,
    padding: 0,
  },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
  },
  clearBtn: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: ORANGE,
  },

  // Recent
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  recentText: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 14,
    color: INK,
  },
  recentRemove: { padding: 4 },

  // Suggestions
  suggestionsList: { flex: 1 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  suggestionImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionContent: { flex: 1 },
  suggestionText: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: INK,
  },
  suggestionType: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: MUTED,
    textTransform: 'capitalize',
    marginTop: 1,
  },

  // Results
  resultsList: { paddingBottom: 100 },
  resultSectionHeader: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  resultCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  resultImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  resultImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  resultFallbackLetter: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: '#FFF',
  },
  resultInfo: { flex: 1, justifyContent: 'center', gap: 3 },
  resultName: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: INK,
  },
  resultMeta: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  resultMetaText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#22C55E',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: '#FFF',
  },

  // Dish
  dishNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vegDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#22C55E',
  },
  nonVegDot: { borderColor: '#EF4444' },
  dishPrice: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: INK,
    marginTop: 2,
  },

  // Loading / Empty / Idle
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 10,
  },
  loadingText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
    marginTop: 12,
  },
  emptySubtext: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
  },
  idleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 8,
  },
  idleText: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: INK,
    marginTop: 12,
  },
  idleSubtext: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: MUTED,
  },
});
