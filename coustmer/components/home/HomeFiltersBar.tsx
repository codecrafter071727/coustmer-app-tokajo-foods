import { Pressable } from '@/components/common/Pressable';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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
import type { Restaurant } from '@/lib/restaurant/types';

type Props = {
  filters: HomeFilterState;
  onChange: (next: HomeFilterState) => void;
  onClear: () => void;
  allRestaurants?: Restaurant[];
  compact?: boolean;
  style?: object;
};

export function HomeFiltersBar({
  filters,
  onChange,
  onClear,
  allRestaurants = [],
  compact = false,
  style,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<FilterSheetTab>('sort');
  const activeCount = countActiveHomeFilters(filters);

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

  const setCuisine = (id: HomeCuisineId) => {
    onChange({
      ...filters,
      cuisine: filters.cuisine === id && id !== 'popular' ? 'popular' : id,
    });
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

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      {!compact ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cuisineRow}
        >
          {HOME_CUISINES.map((cat) => {
            const on = filters.cuisine === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[styles.cuisinePill, on && styles.cuisinePillOn]}
                onPress={() => setCuisine(cat.id)}
              >
                {cat.emoji ? (
                  <Text style={styles.cuisineEmoji}>{cat.emoji}</Text>
                ) : null}
                <Text style={[styles.cuisineLabel, on && styles.cuisineLabelOn]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cuisineRow}
        >
          {HOME_CUISINES.map((cat) => {
            const on = filters.cuisine === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[styles.cuisinePillCompact, on && styles.cuisinePillOn]}
                onPress={() => setCuisine(cat.id)}
              >
                <Text
                  style={[
                    styles.cuisineLabelCompact,
                    on && styles.cuisineLabelOn,
                  ]}
                >
                  {cat.emoji ? `${cat.emoji} ` : ''}
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

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
          style={[styles.filterChip, filters.offersOnly && styles.filterChipOn]}
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
          style={[styles.filterChip, filters.pureVeg && styles.filterChipOn]}
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

      <HomeFilterSheet
        visible={sheetOpen}
        filters={filters}
        restaurants={allRestaurants}
        initialTab={sheetTab}
        onClose={() => setSheetOpen(false)}
        onApply={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    marginBottom: 6,
  },
  wrapCompact: {
    gap: 8,
    paddingBottom: 8,
  },
  cuisineRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  cuisinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cuisinePillCompact: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuisinePillOn: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
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
});
