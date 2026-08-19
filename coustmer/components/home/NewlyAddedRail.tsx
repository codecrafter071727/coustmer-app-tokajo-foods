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
                    <Star color="#FFB800" size={12} fill="#FFB800" strokeWidth={0} />
                    <Text style={styles.ratingText}>{r.rating.toFixed(1)}</Text>
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
  wrap: { marginTop: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
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
    gap: 14,
  },
  card: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imgWrap: {
    height: 140,
    position: 'relative',
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
    backgroundColor: '#FF4757',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  vegMark: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 4,
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  cuisines: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
