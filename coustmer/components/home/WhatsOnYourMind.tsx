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

/**
 * Dynamic “What's on your mind” — only categories present near the user.
 * Renders nothing when the area has no cuisine/menu categories yet.
 */
export function WhatsOnYourMind({ categories }: Props) {
  const router = useRouter();
  if (!categories.length) return null;

  const columns = toColumns(categories);

  const open = (cat: HomeCategory) => {
    router.push({
      pathname: '/restaurants',
      params: { cuisine: cat.slug, label: cat.label },
    });
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
                key={cat.id || cat.slug}
                style={styles.item}
                onPress={() => open(cat)}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
              >
                <View style={styles.imgWrap}>
                  {cat.imageUrl ? (
                    <Image
                      source={{ uri: cat.imageUrl }}
                      style={styles.img}
                      contentFit="cover"
                      transition={180}
                      recyclingKey={cat.slug}
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
    gap: 2,
  },
  column: {
    width: 92,
    gap: 16,
  },
  item: {
    alignItems: 'center',
    width: 92,
  },
  imgWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    overflow: 'hidden',
    backgroundColor: '#F4F4F5',
    marginBottom: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E7E7E7',
  },
  img: {
    width: 78,
    height: 78,
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
