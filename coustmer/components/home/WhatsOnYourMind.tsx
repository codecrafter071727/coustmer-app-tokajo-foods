import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
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

/** Collapsed: row1 = 5 cats, row2 = 4 cats + Show more. */
const ROW1 = 5;
const ROW2_CATS = 4;
const PREVIEW_CATS = ROW1 + ROW2_CATS;
const H_PAD = 12;

export function WhatsOnYourMind({ categories, loading = false }: Props) {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);

  const slotW = (screenW - H_PAD * 2) / ROW1;
  const circle = Math.min(
    MIND_CHIP_SIZE,
    Math.max(52, Math.floor(slotW - 8))
  );

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
  const row2Cats = visible.slice(ROW1, ROW1 + ROW2_CATS);

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

  const renderRow = (
    cats: CuisineChip[],
    key: string,
    trailing?: ReactNode
  ) => (
    <View key={key} style={styles.row}>
      {cats.map((cat) => (
        <MindChip
          key={cat.id || cat.slug}
          label={cat.name}
          slug={cat.slug}
          imageUrl={cat.imageUrl}
          onPress={() => open(cat)}
          slotWidth={slotW}
        />
      ))}
      {trailing}
    </View>
  );

  const moreControl = (mode: 'more' | 'less') => (
    <Pressable
      style={({ pressed }) => [
        { width: slotW },
        styles.moreCol,
        pressed && styles.pressed,
      ]}
      onPress={() => setExpanded(mode === 'more')}
      accessibilityRole="button"
      accessibilityLabel={mode === 'more' ? 'Show more categories' : 'Show less'}
    >
      <View
        style={[
          styles.moreRing,
          {
            width: circle + 4,
            height: circle + 4,
            borderRadius: (circle + 4) / 2,
          },
        ]}
      >
        <View
          style={[
            styles.moreCircle,
            {
              width: circle - 2,
              height: circle - 2,
              borderRadius: (circle - 2) / 2,
            },
            mode === 'less' && styles.moreCircleMuted,
          ]}
        >
          {mode === 'more' ? (
            <LayoutGrid size={18} color="#AC0F45" strokeWidth={2.2} />
          ) : (
            <Text style={styles.moreMinus}>-</Text>
          )}
        </View>
      </View>
      <Text style={styles.moreLabel}>
        {mode === 'more' ? 'Show more' : 'Show less'}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{"What's on your mind?"}</Text>
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
                  ? moreControl('more')
                  : expanded && needsMore && restRows.length === 0
                    ? moreControl('less')
                    : null
              )
            : null}
          {restRows.map((row, i) =>
            renderRow(
              row,
              `row-extra-${i}`,
              i === restRows.length - 1 && needsMore
                ? moreControl('less')
                : null
            )
          )}
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  moreCircle: {
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
    fontSize: 22,
    color: '#52525B',
    lineHeight: 24,
    fontWeight: '600',
  },
  moreLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: '#AC0F45',
    textAlign: 'center',
  },
});
