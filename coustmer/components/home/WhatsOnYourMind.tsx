import { Image } from 'expo-image';
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

import { fonts } from '@/constants/typography';
import type { CuisineChip } from '@/lib/restaurant/types';

type Props = {
  categories: CuisineChip[];
  loading?: boolean;
  /** How many chips to show before “Show more” (paired into 2-row columns). */
  previewCount?: number;
};

const PREVIEW_DEFAULT = 8;
const SIZE = 68;

const EMOJI: Record<string, string> = {
  pizza: '🍕',
  biryani: '🍲',
  burger: '🍔',
  burgers: '🍔',
  'north-indian': '🍛',
  chinese: '🥡',
  dessert: '🍰',
  desserts: '🍰',
  cake: '🍰',
  cafe: '☕',
  rolls: '🌯',
  momos: '🥟',
  shawarma: '🥙',
  'south-indian': '🥞',
  seafood: '🦐',
  pasta: '🍝',
  noodles: '🍜',
  thali: '🍽️',
  chaat: '🫓',
};

function toColumns(cats: CuisineChip[]): CuisineChip[][] {
  const cols: CuisineChip[][] = [];
  for (let i = 0; i < cats.length; i += 2) {
    cols.push(cats.slice(i, i + 2));
  }
  return cols;
}

function MindChip({
  label,
  slug,
  imageUrl,
  onPress,
}: {
  label: string;
  slug: string;
  imageUrl?: string;
  onPress: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const emoji = EMOJI[slug] ?? '🍴';
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.imgWrap}>
        {showImage ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.img}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.img, styles.imgFallback]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * What's on your mind — categories from GET /cuisines/nearby only.
 * Compact circles + “Show more” for the rest.
 */
export function WhatsOnYourMind({
  categories,
  loading = false,
  previewCount = PREVIEW_DEFAULT,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const visible = useMemo(() => {
    if (expanded || categories.length <= previewCount) return categories;
    return categories.slice(0, previewCount);
  }, [categories, expanded, previewCount]);

  const hasMore = categories.length > previewCount && !expanded;
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
              style={styles.moreCol}
              onPress={() => setExpanded(true)}
              accessibilityRole="button"
              accessibilityLabel="Show more categories"
            >
              <View style={styles.moreCircle}>
                <LayoutGrid size={22} color="#AC0F45" strokeWidth={2.2} />
              </View>
              <Text style={styles.moreLabel}>Show more</Text>
            </Pressable>
          ) : null}

          {expanded && categories.length > previewCount ? (
            <Pressable
              style={styles.moreCol}
              onPress={() => setExpanded(false)}
              accessibilityRole="button"
              accessibilityLabel="Show less"
            >
              <View style={[styles.moreCircle, styles.moreCircleMuted]}>
                <Text style={styles.moreMinus}>−</Text>
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
    marginTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: '#1C1C1C',
    letterSpacing: -0.3,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  loadingRow: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    paddingHorizontal: 12,
    gap: 2,
    alignItems: 'flex-start',
  },
  column: {
    width: 84,
    gap: 12,
  },
  item: {
    alignItems: 'center',
    width: 84,
  },
  imgWrap: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#F4F4F5',
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E7E7E7',
  },
  img: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  imgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4EC',
  },
  emoji: {
    fontSize: 28,
  },
  label: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: '#3F3F46',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  moreCol: {
    width: 84,
    alignItems: 'center',
    paddingTop: 0,
  },
  moreCircle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#FFF0F4',
    borderWidth: 1,
    borderColor: '#F5C6D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  moreCircleMuted: {
    backgroundColor: '#F4F4F5',
    borderColor: '#E4E4E7',
  },
  moreMinus: {
    fontSize: 28,
    color: '#52525B',
    lineHeight: 30,
    fontWeight: '600',
  },
  moreLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: '#AC0F45',
    textAlign: 'center',
  },
});
