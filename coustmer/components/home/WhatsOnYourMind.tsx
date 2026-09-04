import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LayoutGrid } from 'lucide-react-native';

import { MindChip, MIND_CHIP_SIZE } from '@/components/home/MindChip';
import { fonts } from '@/constants/typography';
import { resolveMindChipImage } from '@/lib/restaurant/mind-chip-images';
import type { CuisineChip } from '@/lib/restaurant/types';

type Props = {
  categories: CuisineChip[];
  loading?: boolean;
  previewCount?: number;
};

const PREVIEW_DEFAULT = 8;
const SIZE = MIND_CHIP_SIZE;

function toColumns(cats: CuisineChip[]): CuisineChip[][] {
  const cols: CuisineChip[][] = [];
  for (let i = 0; i < cats.length; i += 2) {
    cols.push(cats.slice(i, i + 2));
  }
  return cols;
}

/** Swiggy-style mind strip with real food photos + Show more. */
export function WhatsOnYourMind({
  categories,
  loading = false,
  previewCount = PREVIEW_DEFAULT,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const withPhotos = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        imageUrl: resolveMindChipImage(c.slug, c.name, c.imageUrl),
      })),
    [categories]
  );

  const visible = useMemo(() => {
    if (expanded || withPhotos.length <= previewCount) return withPhotos;
    return withPhotos.slice(0, previewCount);
  }, [withPhotos, expanded, previewCount]);

  const hasMore = withPhotos.length > previewCount && !expanded;
  const columns = toColumns(visible);

  const open = (cat: CuisineChip) => {
    router.push({
      pathname: '/restaurants',
      params: { cuisine: cat.slug, label: cat.name },
    });
  };

  if (!loading && categories.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>What's on your mind?</Text>
      {loading && categories.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#AC0F45" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
          decelerationRate="fast"
        >
          {columns.map((col, idx) => (
            <View key={`col-${idx}`} style={styles.column}>
              {col.map((cat) => (
                <MindChip
                  key={cat.id || cat.slug}
                  label={cat.name}
                  slug={cat.slug}
                  imageUrl={cat.imageUrl}
                  onPress={() => open(cat)}
                />
              ))}
            </View>
          ))}

          {hasMore ? (
            <Pressable
              style={({ pressed }) => [
                styles.moreCol,
                pressed && styles.pressed,
              ]}
              onPress={() => setExpanded(true)}
              accessibilityRole="button"
              accessibilityLabel="Show more categories"
            >
              <View style={styles.moreRing}>
                <View style={styles.moreCircle}>
                  <LayoutGrid size={20} color="#AC0F45" strokeWidth={2.2} />
                </View>
              </View>
              <Text style={styles.moreLabel}>Show more</Text>
            </Pressable>
          ) : null}

          {expanded && withPhotos.length > previewCount ? (
            <Pressable
              style={({ pressed }) => [
                styles.moreCol,
                pressed && styles.pressed,
              ]}
              onPress={() => setExpanded(false)}
              accessibilityRole="button"
              accessibilityLabel="Show less"
            >
              <View style={styles.moreRing}>
                <View style={[styles.moreCircle, styles.moreCircleMuted]}>
                  <Text style={styles.moreMinus}>−</Text>
                </View>
              </View>
              <Text style={styles.moreLabel}>Show less</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    paddingBottom: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: '#111827',
    letterSpacing: -0.45,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  loadingRow: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    paddingHorizontal: 10,
    gap: 4,
    alignItems: 'flex-start',
  },
  column: {
    width: 88,
    gap: 14,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  moreCol: {
    width: 88,
    alignItems: 'center',
  },
  moreRing: {
    width: SIZE + 6,
    height: SIZE + 6,
    borderRadius: (SIZE + 6) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  moreCircle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#FFF5F7',
    borderWidth: 1.5,
    borderColor: '#F3C0CE',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCircleMuted: {
    backgroundColor: '#F4F4F5',
    borderColor: '#D4D4D8',
    borderStyle: 'solid',
  },
  moreMinus: {
    fontSize: 26,
    color: '#52525B',
    lineHeight: 28,
    fontWeight: '600',
  },
  moreLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 11.5,
    color: '#AC0F45',
    textAlign: 'center',
  },
});
