import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
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
};

/** Collapsed grid: row1 = 5 cats, row2 = 4 cats + Show more. */
const ROW1 = 5;
const ROW2_CATS = 4;
const PREVIEW_CATS = ROW1 + ROW2_CATS; // 9

const H_PAD = 12;

/** Row1: 5 categories · Row2: 4 categories + Show more. */
export function WhatsOnYourMind({ categories, loading = false }: Props) {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);

  const slotW = (screenW - H_PAD * 2) / ROW1;

  const withPhotos = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        imageUrl: resolveMindChipImage(c.slug, c.name, c.imageUrl),
      })),
    [categories]
  );

  const needsMore = withPhotos.length > PREVIEW_CATS;

  const visible = useMemo(() => {
    if (expanded || !needsMore) return withPhotos;
    return withPhotos.slice(0, PREVIEW_CATS);
  }, [withPhotos, expanded, needsMore]);

  const row1 = visible.slice(0, ROW1);
  const row2Cats = visible.slice(ROW1, expanded ? undefined : ROW1 + ROW2_CATS);
  // When expanded past 9, remaining rows after row2
  const restRows = useMemo(() => {
    if (!expanded || visible.length <= PREVIEW_CATS) return [] as CuisineChip[][];
    const rest = visible.slice(PREVIEW_CATS);
    const rows: CuisineChip[][] = [];
    for (let i = 0; i < rest.length; i += ROW1) {
      rows.push(rest.slice(i, i + ROW1));
    }
    return rows;
  }, [expanded, visible]);

  const open = (cat: CuisineChip) => {
    router.push({
      pathname: '/restaurants',
      params: { cuisine: cat.slug, label: cat.name },
    });
  };

  if (!loading && categories.length === 0) return null;

  const renderRow = (cats: CuisineChip[], key: string, trailing?: React.ReactNode) => (
    <View key={key} style={styles.row}>
      {cats.map((cat) => (
        <View key={cat.id || cat.slug} style={{ width: slotW }}>
          <MindChip
            label={cat.name}
            slug={cat.slug}
            imageUrl={cat.imageUrl}
            onPress={() => open(cat)}
            slotWidth={slotW}
          />
        </View>
      ))}
      {trailing}
    </View>
  );

  const showMoreBtn = (
    <Pressable
      style={({ pressed }) => [
        { width: slotW },
        styles.moreCol,
        pressed && styles.pressed,
      ]}
      onPress={() => setExpanded(true)}
      accessibilityRole="button"
      accessibilityLabel="Show more categories"
    >
      <View style={styles.moreRing}>
        <View style={styles.moreCircle}>
          <LayoutGrid size={18} color="#AC0F45" strokeWidth={2.2} />
        </View>
      </View>
      <Text style={styles.moreLabel}>Show more</Text>
    </Pressable>
  );

  const showLessBtn = (
    <Pressable
      style={({ pressed }) => [
        { width: slotW },
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
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>What's on your mind?</Text>
      {loading && categories.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#AC0F45" />
        </View>
      ) : (
        <View style={styles.grid}>
          {row1.length > 0 ? renderRow(row1, 'row-1') : null}
          {row2Cats.length > 0 || (!expanded && needsMore)
            ? renderRow(
                row2Cats,
                'row-2',
                !expanded && needsMore
                  ? showMoreBtn
                  : expanded && needsMore && restRows.length === 0
                    ? showLessBtn
                    : null
              )
            : null}
          {restRows.map((row, i) =>
            renderRow(
              row,
              `row-extra-${i}`,
              i === restRows.length - 1 && needsMore ? showLessBtn : null
            )
          )}
        </View>
      )}
    </View>
  );
}

const SIZE = MIND_CHIP_SIZE;

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
  grid: {
    paddingHorizontal: H_PAD,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  moreCol: {
    alignItems: 'center',
  },
  moreRing: {
    width: SIZE + 4,
    height: SIZE + 4,
    borderRadius: (SIZE + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  moreCircle: {
    width: SIZE - 4,
    height: SIZE - 4,
    borderRadius: (SIZE - 4) / 2,
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
    fontSize: 24,
    color: '#52525B',
    lineHeight: 26,
    fontWeight: '600',
  },
  moreLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: '#AC0F45',
    textAlign: 'center',
  },
});
