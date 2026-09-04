import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LayoutGrid } from 'lucide-react-native';

import { MindCategoriesDrawer } from '@/components/home/MindCategoriesDrawer';
import { MindChip, MIND_CHIP_SIZE } from '@/components/home/MindChip';
import { fonts } from '@/constants/typography';
import { resolveMindChipImage } from '@/lib/restaurant/mind-chip-images';
import type { CuisineChip } from '@/lib/restaurant/types';

type Props = {
  categories: CuisineChip[];
  loading?: boolean;
};

/** ~6 columns fit on screen (top + bottom = two lines of 6). */
const COLS_VISIBLE = 6;
const H_PAD = 12;
const GAP = 12;

type Col = { top?: CuisineChip; bottom?: CuisineChip | 'more' };

/**
 * What's on your mind:
 * - ~6 categories per visible line (2-row columns)
 * - Wider gaps + horizontal scroll for more
 * - Show more opens a drawer with every nearby menu category
 * - List stays live from GET /cuisines/nearby (new restaurant categories appear automatically)
 */
export function WhatsOnYourMind({ categories, loading = false }: Props) {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const slotW =
    (screenW - H_PAD * 2 - GAP * (COLS_VISIBLE - 1)) / COLS_VISIBLE;
  const circle = Math.min(
    MIND_CHIP_SIZE,
    Math.max(48, Math.floor(slotW - 6))
  );

  const withPhotos = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        imageUrl: resolveMindChipImage(c.slug, c.name, c.imageUrl),
      })),
    [categories]
  );

  const scrollColumns = useMemo((): Col[] => {
    const cols: Col[] = [];
    for (let i = 0; i < withPhotos.length; i += 2) {
      cols.push({
        top: withPhotos[i],
        bottom: withPhotos[i + 1],
      });
    }
    // Always offer the full-list drawer when there is more than one screenful.
    if (withPhotos.length > COLS_VISIBLE) {
      const last = cols[cols.length - 1];
      if (last && last.bottom == null) {
        last.bottom = 'more';
      } else {
        cols.push({ bottom: 'more' });
      }
    }
    return cols;
  }, [withPhotos]);

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
          {scrollColumns.map((col, idx) => (
            <View
              key={`col-${idx}`}
              style={[styles.column, { width: slotW, marginRight: GAP }]}
            >
              {col.top ? (
                <MindChip
                  label={col.top.name}
                  slug={col.top.slug}
                  imageUrl={col.top.imageUrl}
                  onPress={() => open(col.top!)}
                  slotWidth={slotW}
                />
              ) : (
                <View style={{ height: circle + 36 }} />
              )}
              <View style={{ height: GAP + 6 }} />
              {col.bottom === 'more' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.moreCol,
                    { width: slotW },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setDrawerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Show more categories"
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
                      ]}
                    >
                      <LayoutGrid
                        size={16}
                        color="#AC0F45"
                        strokeWidth={2.2}
                      />
                    </View>
                  </View>
                  <Text style={styles.moreLabel}>Show more</Text>
                </Pressable>
              ) : col.bottom ? (
                <MindChip
                  label={col.bottom.name}
                  slug={col.bottom.slug}
                  imageUrl={col.bottom.imageUrl}
                  onPress={() => open(col.bottom as CuisineChip)}
                  slotWidth={slotW}
                />
              ) : (
                <View style={{ height: circle + 36 }} />
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <MindCategoriesDrawer
        visible={drawerOpen}
        categories={withPhotos}
        onClose={() => setDrawerOpen(false)}
        onSelect={open}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    paddingBottom: 10,
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
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    paddingHorizontal: H_PAD,
    paddingRight: H_PAD + 8,
  },
  column: {
    alignItems: 'center',
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
  moreLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: '#AC0F45',
    textAlign: 'center',
  },
});
