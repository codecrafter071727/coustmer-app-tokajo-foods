import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/typography';
import { buildHomeCategories } from '@/lib/restaurant/home-categories';
import type { Restaurant } from '@/lib/restaurant/types';

type Props = {
  /** Nearby / city restaurants currently on home — mind chips come only from these. */
  restaurants: Restaurant[];
};

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

function toColumns<T>(items: T[]): T[][] {
  const cols: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    cols.push(items.slice(i, i + 2));
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
 * Mind strip built synchronously from restaurant.cuisines only.
 * No React Query / persisted cache — avoids stale invented categories.
 */
export function WhatsOnYourMind({ restaurants }: Props) {
  const router = useRouter();

  const categories = useMemo(
    () => buildHomeCategories({ restaurants }),
    [restaurants]
  );

  if (!categories.length) return null;

  const columns = toColumns(categories);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>What's on your mind?</Text>
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
                key={cat.slug}
                label={cat.label}
                slug={cat.slug}
                imageUrl={cat.imageUrl}
                onPress={() =>
                  router.push({
                    pathname: '/restaurants',
                    params: { cuisine: cat.slug, label: cat.label },
                  })
                }
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const SIZE = 80;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    paddingBottom: 6,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: '#1C1C1C',
    letterSpacing: -0.4,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  rail: {
    paddingHorizontal: 12,
    gap: 4,
  },
  column: {
    width: 96,
    gap: 16,
  },
  item: {
    alignItems: 'center',
    width: 96,
  },
  imgWrap: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#F4F4F5',
    marginBottom: 8,
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
    fontSize: 34,
  },
  label: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#3F3F46',
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 2,
  },
});
