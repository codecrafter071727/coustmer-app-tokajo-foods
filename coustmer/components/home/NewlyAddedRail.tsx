import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Clock, Star } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VegMarkIcon } from '@/components/home/VegMarkIcon';
import type { HomeRestaurantCard } from '@/lib/home/types';

type Props = {
  restaurants: HomeRestaurantCard[];
  onPressRestaurant?: (id: string) => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
};

export function NewlyAddedRail({
  restaurants,
  onPressRestaurant,
  loading,
  title = 'Newly added',
  subtitle = 'Fresh partners joining near you',
}: Props) {
  const router = useRouter();

  if (!loading && (!restaurants || restaurants.length === 0)) return null;

  const go = (id: string) => {
    if (onPressRestaurant) {
      onPressRestaurant(id);
    } else {
      router.push({ pathname: '/restaurants/[restaurantId]', params: { restaurantId: id } });
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={280}
        decelerationRate="fast"
      >
        {restaurants.map((r) => (
          <Pressable key={r.id} style={styles.card} onPress={() => go(r.id)}>
            {/* Image */}
            <View style={styles.imgWrap}>
              {r.image ? (
                <Image source={{ uri: r.image }} style={styles.img} contentFit="cover" />
              ) : (
                <View style={[styles.img, styles.imgFallback]} />
              )}

              {/* NEW badge */}
              <View style={styles.newBadge}>
                <Text style={styles.newText}>NEW</Text>
              </View>

              {/* Veg mark */}
              {r.isPureVeg && (
                <View style={styles.vegMark}>
                  <VegMarkIcon variant="veg" size={14} />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {r.name}
              </Text>

              <View style={styles.meta}>
                {typeof r.rating === 'number' && r.rating > 0 && (
                  <View style={styles.rating}>
                    <Text style={styles.ratingText}>{r.rating.toFixed(1)}</Text>
                    <Star color="#1BA672" size={11} fill="#1BA672" strokeWidth={0} />
                  </View>
                )}

                {r.deliveryTime && (
                  <View style={styles.time}>
                    <Clock color="#64748B" size={12} strokeWidth={2} />
                    <Text style={styles.timeText}>{r.deliveryTime}</Text>
                  </View>
                )}
              </View>

              {r.cuisines && r.cuisines.length > 0 && (
                <Text style={styles.cuisines} numberOfLines={1}>
                  {r.cuisines.slice(0, 3).join(' • ')}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1C1C1C',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    gap: 14,
  },
  card: {
    width: 232,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imgWrap: {
    height: 132,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F4F4F5',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgFallback: {
    backgroundColor: '#F1F5F9',
  },
  newBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#F97316',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  vegMark: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 3,
  },
  info: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#1C1C1C',
    letterSpacing: -0.2,
    marginBottom: 5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EAF6EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1BA672',
  },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  cuisines: {
    fontSize: 12.5,
    color: '#9A9A9A',
    fontWeight: '500',
  },
});
