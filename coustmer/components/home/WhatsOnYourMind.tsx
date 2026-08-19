import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import { useHomeCategories } from '@/lib/restaurant/hooks';
import type { Restaurant } from '@/lib/restaurant/types';

type Props = {
  restaurants?: Restaurant[];
};

export function WhatsOnYourMind({ restaurants = [] }: Props) {
  const router = useRouter();
  const cats = useHomeCategories(restaurants);

  if (!cats.data || cats.data.length === 0) return null;

  const go = (slug: string) => {
    router.push({ pathname: '/restaurants', params: { cuisine: slug } });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>What's on your mind?</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        decelerationRate="fast"
      >
        {cats.data.map((cat) => (
          <Pressable
            key={cat.slug}
            style={styles.item}
            onPress={() => go(cat.slug)}
          >
            {cat.imageUrl ? (
              <Image
                source={{ uri: cat.imageUrl }}
                style={styles.img}
                contentFit="contain"
                transition={150}
              />
            ) : null}
            <Text style={styles.label} numberOfLines={2}>
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  list: {
    paddingHorizontal: 20,
    gap: 22,
  },
  item: {
    alignItems: 'center',
    width: 78,
  },
  img: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 8,
    backgroundColor: '#F1F5F9',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 15,
  },
});
