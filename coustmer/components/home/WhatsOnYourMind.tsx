import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@/constants/typography';
import type { HomeCategory } from '@/lib/home/types';
import { HOME_CATEGORY_PREVIEW_COUNT } from '@/lib/restaurant/home-categories';

/**
 * Fallback chips when API aggregation is empty.
 */
export const MIND_CATEGORIES: HomeCategory[] = [
  {
    id: 'mind-burger',
    label: 'Burger',
    slug: 'burger',
    imageUrl:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop&q=90',
    sortOrder: 1,
  },
  {
    id: 'mind-pizza',
    label: 'Pizza',
    slug: 'pizza',
    imageUrl:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop&q=90',
    sortOrder: 2,
  },
  {
    id: 'mind-biryani',
    label: 'Biryani',
    slug: 'biryani',
    imageUrl:
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=200&h=200&fit=crop&q=90',
    sortOrder: 3,
  },
  {
    id: 'mind-chinese',
    label: 'Chinese',
    slug: 'chinese',
    imageUrl:
      'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=200&h=200&fit=crop&q=90',
    sortOrder: 4,
  },
  {
    id: 'mind-desserts',
    label: 'Desserts',
    slug: 'dessert',
    imageUrl:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop&q=90',
    sortOrder: 5,
  },
  {
    id: 'mind-rolls',
    label: 'Rolls',
    slug: 'rolls',
    imageUrl:
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop&q=90',
    sortOrder: 6,
  },
  {
    id: 'mind-seafood',
    label: 'Sea Food',
    slug: 'seafood',
    imageUrl:
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&h=200&fit=crop&q=90',
    sortOrder: 7,
  },
  {
    id: 'mind-steak',
    label: 'Steak',
    slug: 'steak',
    imageUrl:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&h=200&fit=crop&q=90',
    sortOrder: 8,
  },
];

type Props = {
  categories?: HomeCategory[];
  loading?: boolean;
  /** Compact sticky strip — slightly smaller items. */
  compact?: boolean;
  /** Hide the title row. */
  hideTitle?: boolean;
  onSelect?: (slug: string) => void;
};

export function WhatsOnYourMind({
  categories,
  loading = false,
  compact = false,
  hideTitle = false,
  onSelect,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showAll, setShowAll] = useState(false);

  const list = useMemo(() => {
    const raw =
      categories && categories.length > 0
        ? categories.filter((c) => c.slug !== 'all')
        : MIND_CATEGORIES;
    return [...raw].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [categories]);

  const preview = list.slice(0, HOME_CATEGORY_PREVIEW_COUNT);
  const hasMore = list.length > HOME_CATEGORY_PREVIEW_COUNT;

  const handlePress = (slug: string) => {
    onSelect?.(slug);
    setShowAll(false);
    router.push({ pathname: '/restaurants', params: { cuisine: slug } });
  };

  const renderChip = (cat: HomeCategory, large = false) => (
    <Pressable
      key={cat.id || cat.slug}
      style={[
        styles.item,
        compact && styles.itemCompact,
        large && styles.itemGrid,
      ]}
      onPress={() => handlePress(cat.slug)}
    >
      <View
        style={[
          styles.imageWrap,
          compact && styles.imageWrapCompact,
          large && styles.imageWrapGrid,
        ]}
      >
        <Image
          source={{ uri: cat.imageUrl }}
          style={[
            styles.image,
            compact && styles.imageCompact,
            large && styles.imageGrid,
          ]}
          contentFit="cover"
          transition={200}
        />
      </View>
      <Text
        style={[
          styles.label,
          compact && styles.labelCompact,
          large && styles.labelGrid,
        ]}
        numberOfLines={2}
      >
        {cat.label}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!hideTitle && !compact ? (
        <Text style={styles.title}>
          <Text style={styles.titleDark}>What's </Text>
          <Text style={styles.titleAccent}>your craving</Text>
          <Text style={styles.titleDark}> today?</Text>
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={[styles.row, compact && styles.rowCompact]}
      >
        {loading && list.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <View key={`sk-${i}`} style={[styles.item, styles.skeleton]}>
                <View style={[styles.imageWrap, styles.skeletonBox]} />
                <View style={styles.skeletonLabel} />
              </View>
            ))
          : preview.map((cat) => renderChip(cat))}

        {hasMore ? (
          <Pressable
            style={[styles.item, compact && styles.itemCompact]}
            onPress={() => setShowAll(true)}
          >
            <View
              style={[
                styles.imageWrap,
                styles.showAllWrap,
                compact && styles.imageWrapCompact,
              ]}
            >
              <LayoutGrid color="#EA580C" size={28} strokeWidth={2.2} />
            </View>
            <Text
              style={[styles.label, styles.showAllLabel, compact && styles.labelCompact]}
              numberOfLines={1}
            >
              Show all
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        visible={showAll}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAll(false)}
      >
        <View style={[styles.sheet, { paddingTop: insets.top + 8 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>All categories</Text>
            <Pressable onPress={() => setShowAll(false)} hitSlop={8}>
              <Text style={styles.sheetClose}>Close</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[
              styles.grid,
              { paddingBottom: insets.bottom + 24 },
            ]}
          >
            {list.map((cat) => renderChip(cat, true))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 12,
  },
  wrapCompact: {
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: '#0B1220',
    letterSpacing: -0.4,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  titleDark: {
    color: '#0B1220',
    fontFamily: fonts.displayBold,
  },
  titleAccent: {
    color: '#EA580C',
    fontFamily: fonts.displayBold,
  },
  row: {
    paddingHorizontal: 12,
    gap: 4,
  },
  rowCompact: {
    paddingHorizontal: 8,
  },
  item: {
    width: 84,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  itemCompact: {
    width: 72,
  },
  itemGrid: {
    width: '25%',
    marginHorizontal: 0,
    marginBottom: 16,
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapCompact: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  imageWrapGrid: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageCompact: {},
  imageGrid: {},
  showAllWrap: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  showAllLabel: {
    color: '#EA580C',
    fontFamily: fonts.uiBold,
  },
  label: {
    marginTop: 8,
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: 11,
    marginTop: 6,
  },
  labelGrid: {
    fontSize: 12,
    paddingHorizontal: 4,
  },
  skeleton: {
    opacity: 0.7,
  },
  skeletonBox: {
    backgroundColor: '#E5E7EB',
  },
  skeletonLabel: {
    marginTop: 10,
    width: 48,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
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
    color: '#EA580C',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 16,
    paddingHorizontal: 8,
  },
});
