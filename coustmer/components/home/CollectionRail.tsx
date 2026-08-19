import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Collection } from '@/lib/customer/types';

type Props = {
  collections: Collection[];
};

const GRADIENTS: [string, string][] = [
  ['#FF6B6B', '#FF8E53'],
  ['#4158D0', '#C850C0'],
  ['#0093E9', '#80D0C7'],
  ['#FA8BFF', '#2BD2FF'],
  ['#FBD786', '#F7797D'],
];

export function CollectionRail({ collections }: Props) {
  const router = useRouter();

  if (!collections || collections.length === 0) return null;

  const go = (slug: string) => {
    router.push({
      pathname: '/collections/[slug]',
      params: { slug },
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore Collections</Text>
        <Text style={styles.subtitle}>Curated lists just for you</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={180}
        decelerationRate="fast"
      >
        {collections.map((col, i) => (
          <Pressable
            key={col.slug}
            style={styles.card}
            onPress={() => go(col.slug)}
          >
            {col.imageUrl ? (
              <>
                <Image
                  source={{ uri: col.imageUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
                {/* Gradient overlay for text readability */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.75)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </>
            ) : (
              <LinearGradient
                colors={GRADIENTS[i % GRADIENTS.length]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}

            <View style={styles.content}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {col.title}
              </Text>
              <Text style={styles.count}>{col.restaurantCount} places</Text>
            </View>

            <View style={styles.chevron}>
              <ChevronRight color="#fff" size={18} strokeWidth={2.5} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: 165,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    justifyContent: 'flex-end',
  },
  content: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 20,
    marginBottom: 4,
  },
  count: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  chevron: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
