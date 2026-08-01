import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/typography';
import type { HomeCategory } from '@/lib/home/types';

/**
 * Category data with PNG cutout images — no background circles.
 * The image URLs point to transparent PNG food icons (Unsplash food cutouts).
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
    id: 'mind-steak',
    label: 'Steak',
    slug: 'steak',
    imageUrl:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&h=200&fit=crop&q=90',
    sortOrder: 2,
  },
  {
    id: 'mind-seafood',
    label: 'Sea Food',
    slug: 'seafood',
    imageUrl:
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&h=200&fit=crop&q=90',
    sortOrder: 3,
  },
  {
    id: 'mind-desserts',
    label: 'Desserts',
    slug: 'dessert',
    imageUrl:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop&q=90',
    sortOrder: 4,
  },
  {
    id: 'mind-pizza',
    label: 'Pizza',
    slug: 'pizza',
    imageUrl:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop&q=90',
    sortOrder: 5,
  },
  {
    id: 'mind-biryani',
    label: 'Biryani',
    slug: 'biryani',
    imageUrl:
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=200&h=200&fit=crop&q=90',
    sortOrder: 6,
  },
  {
    id: 'mind-chinese',
    label: 'Chinese',
    slug: 'chinese',
    imageUrl:
      'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=200&h=200&fit=crop&q=90',
    sortOrder: 7,
  },
  {
    id: 'mind-rolls',
    label: 'Rolls',
    slug: 'rolls',
    imageUrl:
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop&q=90',
    sortOrder: 8,
  },
];

type Props = {
  categories?: HomeCategory[];
  /** Compact sticky strip — slightly smaller items. */
  compact?: boolean;
  /** Hide the title row. */
  hideTitle?: boolean;
  onSelect?: (slug: string) => void;
};

export function WhatsOnYourMind({
  categories,
  compact = false,
  hideTitle = false,
  onSelect,
}: Props) {
  const router = useRouter();
  const list =
    categories && categories.length > 0
      ? categories.filter((c) => c.slug !== 'all')
      : MIND_CATEGORIES;

  const handlePress = (slug: string) => {
    onSelect?.(slug);
    router.push({ pathname: '/restaurants', params: { cuisine: slug } });
  };

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
        {list.map((cat) => (
          <Pressable
            key={cat.id || cat.slug}
            style={[styles.item, compact && styles.itemCompact]}
            onPress={() => handlePress(cat.slug)}
          >
            {/* Image with NO background — transparent cutout effect */}
            <View style={[styles.imageWrap, compact && styles.imageWrapCompact]}>
              <Image
                source={{ uri: cat.imageUrl }}
                style={[styles.image, compact && styles.imageCompact]}
                contentFit="cover"
                transition={200}
              />
            </View>
            <Text
              style={[styles.label, compact && styles.labelCompact]}
              numberOfLines={1}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
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
    paddingHorizontal: 10,
    gap: 2,
  },

  // ── Item ──
  item: {
    width: 76,
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemCompact: {
    width: 62,
  },

  // ── Image container — no background (transparent) ──
  imageWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF5EE', // Very soft warm tint — mimics the design's slight warm bg
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow to lift the food off the background
    shadowColor: '#F97316',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  imageWrapCompact: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageCompact: {
    width: '100%',
    height: '100%',
  },

  // ── Label ──
  label: {
    marginTop: 7,
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  labelCompact: {
    marginTop: 4,
    fontSize: 10,
  },
});
