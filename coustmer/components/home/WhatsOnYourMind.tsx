import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

/** How many columns fill the first screen (no right empty strip). */
const COLS_VISIBLE = 6;
const H_PAD = 8;
const GAP = 6;

type Col = { top?: CuisineChip; bottom?: CuisineChip | 'more' };

/**
 * What's on your mind — chips sized from measured width so 6 columns
 * fill the screen edge-to-edge (no white gap on the right).
 */
export function WhatsOnYourMind({ categories, loading = false }: Props) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railW, setRailW] = useState(0);

  const onRailLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== railW) setRailW(w);
  };

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

  // Fill the measured row: ≤6 cols stretch full width; more scroll at 6-up density.
  const innerW = Math.max(0, railW - H_PAD * 2);
  const colCount = Math.max(1, scrollColumns.length);
  const colsForFit = Math.min(COLS_VISIBLE, colCount);
  const slotW =
    railW > 0
      ? (innerW - GAP * Math.max(0, colsForFit - 1)) / colsForFit
      : 56;
  const circle = Math.min(
    MIND_CHIP_SIZE,
    Math.max(48, Math.floor(slotW - 4))
  );
  const open = (cat: CuisineChip) => {
    router.push({
      pathname: '/restaurants',
      params: { cuisine: cat.slug, label: cat.name },
    });
  };

  if (!loading && categories.length === 0) return null;

  return (
    <View style={styles.wrap} onLayout={onRailLayout}>
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
          {scrollColumns.map((col, idx) => {
            const isLast = idx === scrollColumns.length - 1;
            return (
              <View
                key={`col-${idx}`}
                style={[
                  styles.column,
                  {
                    width: slotW,
                    marginRight: isLast ? 0 : GAP,
                  },
                ]}
              >
                {col.top ? (
                  <MindChip
                    label={col.top.name}
                    slug={col.top.slug}
                    imageUrl={col.top.imageUrl}
                    onPress={() => open(col.top!)}
                    slotWidth={slotW}
                    circleSize={circle}
                  />
                ) : (
                  <View style={{ height: circle + 34 }} />
                )}
                <View style={{ height: GAP + 8 }} />
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
                          width: circle + 2,
                          height: circle + 2,
                          borderRadius: (circle + 2) / 2,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.moreCircle,
                          {
                            width: circle,
                            height: circle,
                            borderRadius: circle / 2,
                          },
                        ]}
                      >
                        <LayoutGrid
                          size={Math.round(circle * 0.28)}
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
                    circleSize={circle}
                  />
                ) : (
                  <View style={{ height: circle + 34 }} />
                )}
              </View>
            );
          })}
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
    width: '100%',
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
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    paddingHorizontal: H_PAD,
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
