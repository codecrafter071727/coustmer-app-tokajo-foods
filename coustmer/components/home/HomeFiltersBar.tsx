import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ChevronDown,
  LayoutGrid,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeFilterSheet } from '@/components/home/HomeFilterSheet';
import { fonts } from '@/constants/typography';
import {
  countActiveHomeFilters,
  HOME_CUISINES,
  HOME_SORT_OPTIONS,
  type FilterSheetTab,
  type HomeCuisineId,
  type HomeFilterState,
} from '@/lib/home/filters';
import type { HomeCategory } from '@/lib/home/types';
import { findCategoryBySlug } from '@/lib/restaurant/categories';
import { HOME_CATEGORY_PREVIEW_COUNT } from '@/lib/restaurant/home-categories';
import type { Restaurant } from '@/lib/restaurant/types';

const POPULAR_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&h=120&fit=crop&q=80';
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=120&h=120&fit=crop&q=80';

type CuisineChip = {
  id: HomeCuisineId;
  label: string;
  emoji?: string;
  imageUrl: string;
};

type Props = {
  filters: HomeFilterState;
  onChange: (next: HomeFilterState) => void;
  onClear: () => void;
  allRestaurants?: Restaurant[];
  /** Live categories from GET .../categories aggregation. */
  categories?: HomeCategory[];
  compact?: boolean;
  /** Sticky strip: cuisine chips only — hide Filters / Sort / quick chips. */
  categoriesOnly?: boolean;
  style?: object;
};

function emojiForSlug(slug: string): string | undefined {
  const hit = HOME_CUISINES.find(
    (c) => c.id === slug || c.id.replace(/_/g, '-') === slug
  );
  return hit?.emoji;
}

function imageForSlug(slug: string, apiUrl?: string): string {
  if (apiUrl) return apiUrl;
  if (slug === 'popular') return POPULAR_IMAGE;

  const aliases: Record<string, string> = {
    beverages: 'cafe',
    beverage: 'cafe',
    drinks: 'cafe',
    'main-course': 'north-indian',
    mains: 'north-indian',
    starters: 'rolls',
    starter: 'rolls',
    appetizers: 'rolls',
    desserts: 'dessert',
    sweets: 'dessert',
    breads: 'north-indian',
    'breads-and-rice': 'north-indian',
    breakfast: 'south-indian',
    thalis: 'north-indian',
    pizzas: 'pizza',
    dosa: 'south-indian',
    chaat: 'north-indian',
    snacks: 'burger',
    sides: 'burger',
    biryani: 'biryani',
    'biryani-specials': 'biryani',
  };

  const mapped = aliases[slug] || aliases[slug.replace(/_/g, '-')];
  const known =
    findCategoryBySlug(mapped || slug) ||
    findCategoryBySlug(slug.replace(/_/g, '-')) ||
    findCategoryBySlug(slug.replace(/-/g, ' '));
  return known?.imageUrl || FALLBACK_IMAGE;
}

export function HomeFiltersBar({
  filters,
  onChange,
  onClear,
  allRestaurants = [],
  categories,
  compact = false,
  categoriesOnly = false,
  style,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<FilterSheetTab>('sort');
  const [showAllCats, setShowAllCats] = useState(false);
  const activeCount = countActiveHomeFilters(filters);

  const cuisineChips = useMemo((): CuisineChip[] => {
    const popular: CuisineChip = {
      id: 'popular',
      label: 'Popular',
      imageUrl: POPULAR_IMAGE,
    };
    const fromApi = (categories ?? [])
      .filter((c) => c.slug && c.slug !== 'all' && c.slug !== 'popular')
      .map((c) => ({
        id: c.slug,
        label: c.label,
        emoji: emojiForSlug(c.slug),
        imageUrl: imageForSlug(c.slug, c.imageUrl),
      }));

    if (fromApi.length === 0) {
      return HOME_CUISINES.map((c) => ({
        ...c,
        imageUrl: imageForSlug(c.id),
      }));
    }

    const seen = new Set<string>(['popular']);
    const rest: CuisineChip[] = [];
    for (const chip of fromApi) {
      if (seen.has(chip.id)) continue;
      seen.add(chip.id);
      rest.push(chip);
    }
    return [popular, ...rest];
  }, [categories]);

  // Always keep Popular; preview up to 10 API categories after it
  const previewChips = useMemo(() => {
    if (cuisineChips.length <= 1) return cuisineChips;
    const [popular, ...rest] = cuisineChips;
    return [popular, ...rest.slice(0, HOME_CATEGORY_PREVIEW_COUNT)];
  }, [cuisineChips]);
  const hasMoreCats = cuisineChips.length - 1 > HOME_CATEGORY_PREVIEW_COUNT;

  const filterChipLabel = useMemo(() => {
    if (activeCount === 0) return 'Filters';
    return `Filters (${activeCount})`;
  }, [activeCount]);

  const sortHint = useMemo(() => {
    if (filters.sort === 'nearest' || filters.nearOnly) return 'Sort';
    const hit = HOME_SORT_OPTIONS.find((s) => s.id === filters.sort);
    return hit && filters.sort !== 'relevance' ? hit.label : 'Sort';
  }, [filters.sort, filters.nearOnly]);

  const openSheet = (tab: FilterSheetTab = 'sort') => {
    setSheetTab(tab);
    setSheetOpen(true);
  };

  const setCuisine = (id: HomeCuisineId, label?: string) => {
    setShowAllCats(false);

    // Popular stays on home; other categories open a dishes page
    if (id === 'popular') {
      onChange({ ...filters, cuisine: 'popular' });
      return;
    }

    onChange({ ...filters, cuisine: 'popular' });
    router.push({
      pathname: '/restaurants',
      params: {
        cuisine: id,
        label: label || titleFromChip(id),
        view: 'dishes',
      },
    });
  };

  const titleFromChip = (id: string) => {
    const chip = cuisineChips.find((c) => c.id === id);
    if (chip?.label) return chip.label;
    return id
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const quickToggle = (key: 'offersOnly' | 'pureVeg') => {
    onChange({ ...filters, [key]: !filters[key] });
  };

  const toggleNear = () => {
    const on = !filters.nearOnly;
    onChange({
      ...filters,
      nearOnly: on,
      sort: on
        ? 'nearest'
        : filters.sort === 'nearest'
          ? 'relevance'
          : filters.sort,
    });
  };

  const toggleFast = () => {
    const isFast =
      filters.timeBand === 'under_30' || filters.timeBand === 'under_20';
    onChange({
      ...filters,
      timeBand: isFast ? 'any' : 'under_30',
    });
  };

  const toggleUnder200 = () => {
    onChange({
      ...filters,
      priceBand: filters.priceBand === 'under_200' ? 'any' : 'under_200',
    });
  };

  const nearOn = filters.nearOnly || filters.sort === 'nearest';
  const fastOn = filters.timeBand === 'under_30' || filters.timeBand === 'under_20';
  const under200On = filters.priceBand === 'under_200';

  const renderCuisinePill = (cat: CuisineChip, pillCompact: boolean) => {
    const on = filters.cuisine === cat.id;
    const thumbSize = pillCompact ? 22 : 28;
    return (
      <Pressable
        key={cat.id}
        style={[
          pillCompact ? styles.cuisinePillCompact : styles.cuisinePill,
          on && styles.cuisinePillOn,
        ]}
        onPress={() => setCuisine(cat.id, cat.label)}
      >
        <View
          style={[
            styles.cuisineThumbWrap,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
            },
            on && styles.cuisineThumbOn,
          ]}
        >
          <Image
            source={{ uri: cat.imageUrl }}
            style={styles.cuisineThumb}
            contentFit="cover"
            transition={150}
          />
        </View>
        <Text
          style={[
            pillCompact ? styles.cuisineLabelCompact : styles.cuisineLabel,
            on && styles.cuisineLabelOn,
          ]}
          numberOfLines={1}
        >
          {cat.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cuisineRow}
      >
        {previewChips.map((cat) => renderCuisinePill(cat, compact))}

        {hasMoreCats ? (
          <Pressable
            style={[
              compact ? styles.cuisinePillCompact : styles.cuisinePill,
              styles.showAllPill,
            ]}
            onPress={() => setShowAllCats(true)}
          >
            <LayoutGrid color="#F97316" size={14} strokeWidth={2.4} />
            <Text style={[styles.cuisineLabel, styles.showAllLabel]}>
              Show all
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {categoriesOnly ? null : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {activeCount > 0 ? (
            <Pressable style={styles.clearChip} onPress={onClear}>
              <X color="#F97316" size={14} strokeWidth={2.6} />
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.filterChip, activeCount > 0 && styles.filterChipOn]}
            onPress={() => openSheet('sort')}
          >
            <SlidersHorizontal
              color={activeCount > 0 ? '#F97316' : '#1F2937'}
              size={14}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.filterLabel,
                activeCount > 0 && styles.filterLabelOn,
              ]}
            >
              {filterChipLabel}
            </Text>
            <ChevronDown
              color={activeCount > 0 ? '#F97316' : '#475569'}
              size={14}
              strokeWidth={2.5}
            />
          </Pressable>

          <Pressable
            style={[styles.filterChip, nearOn && styles.filterChipOn]}
            onPress={toggleNear}
          >
            <Text
              style={[styles.filterLabel, nearOn && styles.filterLabelOn]}
            >
              Near
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, fastOn && styles.filterChipOn]}
            onPress={toggleFast}
          >
            <Text
              style={[styles.filterLabel, fastOn && styles.filterLabelOn]}
            >
              Fast
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, under200On && styles.filterChipOn]}
            onPress={toggleUnder200}
          >
            <Text
              style={[styles.filterLabel, under200On && styles.filterLabelOn]}
            >
              Under ₹200
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filters.sort !== 'relevance' &&
                !nearOn &&
                styles.filterChipOn,
            ]}
            onPress={() => openSheet('sort')}
          >
            <Text
              style={[
                styles.filterLabel,
                filters.sort !== 'relevance' && styles.filterLabelOn,
              ]}
            >
              {sortHint}
            </Text>
            <ChevronDown
              color={filters.sort !== 'relevance' ? '#F97316' : '#475569'}
              size={14}
              strokeWidth={2.5}
            />
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filters.ratingBand !== 'any' && styles.filterChipOn,
            ]}
            onPress={() => openSheet('rating')}
          >
            <Text
              style={[
                styles.filterLabel,
                filters.ratingBand !== 'any' && styles.filterLabelOn,
              ]}
            >
              {filters.ratingBand === 'any'
                ? 'Rating'
                : `Rating ${filters.ratingBand}+`}
            </Text>
            <ChevronDown
              color={filters.ratingBand !== 'any' ? '#F97316' : '#475569'}
              size={14}
              strokeWidth={2.5}
            />
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filters.timeBand !== 'any' && styles.filterChipOn,
            ]}
            onPress={() => openSheet('time')}
          >
            <Text
              style={[
                styles.filterLabel,
                filters.timeBand !== 'any' && styles.filterLabelOn,
              ]}
            >
              {filters.timeBand === 'any'
                ? 'Time'
                : filters.timeBand === 'under_20'
                  ? '< 20 mins'
                  : filters.timeBand === 'under_30'
                    ? '< 30 mins'
                    : '< 45 mins'}
            </Text>
            <ChevronDown
              color={filters.timeBand !== 'any' ? '#F97316' : '#475569'}
              size={14}
              strokeWidth={2.5}
            />
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filters.priceBand !== 'any' && styles.filterChipOn,
            ]}
            onPress={() => openSheet('price')}
          >
            <Text
              style={[
                styles.filterLabel,
                filters.priceBand !== 'any' && styles.filterLabelOn,
              ]}
            >
              {filters.priceBand === 'any'
                ? 'Price'
                : filters.priceBand === 'under_200'
                  ? 'Under ₹200'
                  : filters.priceBand === '200_350'
                    ? '₹200-350'
                    : 'Above ₹350'}
            </Text>
            <ChevronDown
              color={filters.priceBand !== 'any' ? '#F97316' : '#475569'}
              size={14}
              strokeWidth={2.5}
            />
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filters.offersOnly && styles.filterChipOn,
            ]}
            onPress={() => quickToggle('offersOnly')}
          >
            <Text
              style={[
                styles.filterLabel,
                filters.offersOnly && styles.filterLabelOn,
              ]}
            >
              Offers
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filters.pureVeg && styles.filterChipOn,
            ]}
            onPress={() => quickToggle('pureVeg')}
          >
            <Text
              style={[
                styles.filterLabel,
                filters.pureVeg && styles.filterLabelOn,
              ]}
            >
              Pure Veg
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {categoriesOnly ? null : (
        <HomeFilterSheet
          visible={sheetOpen}
          filters={filters}
          restaurants={allRestaurants}
          initialTab={sheetTab}
          onClose={() => setSheetOpen(false)}
          onApply={onChange}
        />
      )}

      <Modal
        visible={showAllCats}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllCats(false)}
      >
        <View style={[styles.sheet, { paddingTop: insets.top + 8 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>All categories</Text>
            <Pressable onPress={() => setShowAllCats(false)} hitSlop={8}>
              <Text style={styles.sheetClose}>Close</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[
              styles.allGrid,
              { paddingBottom: insets.bottom + 24 },
            ]}
          >
            {cuisineChips.map((cat) => {
              const on = filters.cuisine === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.allChip, on && styles.cuisinePillOn]}
                  onPress={() => setCuisine(cat.id, cat.label)}
                >
                  <View
                    style={[
                      styles.cuisineThumbWrap,
                      styles.allThumb,
                      on && styles.cuisineThumbOn,
                    ]}
                  >
                    <Image
                      source={{ uri: cat.imageUrl }}
                      style={styles.cuisineThumb}
                      contentFit="cover"
                    />
                  </View>
                  <Text
                    style={[styles.cuisineLabel, on && styles.cuisineLabelOn]}
                    numberOfLines={1}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    marginBottom: 6,
  },
  wrapCompact: {
    gap: 0,
    paddingBottom: 10,
    marginBottom: 0,
  },
  cuisineRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  cuisinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 14,
    height: 42,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cuisinePillCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 12,
    height: 34,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cuisinePillOn: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  cuisineThumbWrap: {
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  cuisineThumbOn: {
    borderWidth: 1.5,
    borderColor: '#F97316',
  },
  cuisineThumb: {
    width: '100%',
    height: '100%',
  },
  allThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  cuisineEmoji: {
    fontSize: 15,
  },
  cuisineLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: '#1F2937',
  },
  cuisineLabelCompact: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#1F2937',
  },
  cuisineLabelOn: {
    color: '#F97316',
    fontFamily: fonts.uiBold,
  },
  showAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  showAllLabel: {
    color: '#F97316',
    fontFamily: fonts.uiBold,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterChipOn: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  filterLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: '#1F2937',
  },
  filterLabelOn: {
    color: '#F97316',
    fontFamily: fonts.uiBold,
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  clearText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#F97316',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  sheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: '#0B1220',
  },
  sheetClose: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: '#F97316',
  },
  allGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
  },
  allChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
});
