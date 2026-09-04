import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/typography';
import type { HomeCategory } from '@/lib/home/types';

type Props = {
  categories: HomeCategory[];
};

/** Pair categories into columns for Swiggy-style 2-row mind strip. */
function toColumns(cats: HomeCategory[]): HomeCategory[][] {
  const cols: HomeCategory[][] = [];
  for (let i = 0; i < cats.length; i += 2) {
    cols.push(cats.slice(i, i + 2));
  }
  return cols;
}

export function WhatsOnYourMind({ categories }: Props) {
  const router = useRouter();
  if (!categories.length) return null;

  const columns = toColumns(categories.slice(0, 16));

  const open = (slug: string) => {
    router.push({ pathname: '/restaurants', params: { cuisine: slug } });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>What&apos;s on your mind?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        decelerationRate="fast"
      >
        {columns.map((col, idx) => (
          <View key={`col-${idx}`} style={styles.column}>
            {col.map((cat) => (
              <Pressable
                key={cat.slug}
                style={styles.item}
                onPress={() => open(cat.slug)}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
              >
                <View style={styles.imgWrap}>
                  {cat.imageUrl ? (
                    <Image
                      source={{ uri: cat.imageUrl }}
                      style={styles.img}
                      contentFit="cover"
                      transition={160}
                    />
                  ) : (
                    <View style={[styles.img, styles.imgFallback]} />
                  )}
                </View>
                <Text style={styles.label} numberOfLines={2}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
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
    width: 88,
    gap: 14,
  },
  item: {
    alignItems: 'center',
    width: 88,
  },
  imgWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#F4F4F5',
    marginBottom: 6,
  },
  img: {
    width: 72,
    height: 72,
  },
  imgFallback: {
    backgroundColor: '#FFE8D6',
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
