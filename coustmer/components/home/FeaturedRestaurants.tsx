import { Pressable } from '@/components/common/Pressable';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Clock, Star } from 'lucide-react-native';

import { fonts } from '@/constants/typography';
import type { Restaurant } from '@/lib/restaurant/types';

type Props = {
  restaurants: Restaurant[];
};

function offerPercent(id: string, name: string) {
  const options = [35, 40, 50];
  const seed = (id || name || 'deal')
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return options[seed % options.length];
}

function formatRating(rating?: number) {
  if (typeof rating === 'number' && rating > 0) return rating.toFixed(1);
  return '4.5';
}

export function FeaturedRestaurants({ restaurants }: Props) {
  const router = useRouter();

  if (!restaurants || restaurants.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    >
      {restaurants.map((item) => {
        const cover = item.coverUrl || item.imageUrl || item.logoUrl;
        const percent = offerPercent(item.id, item.name || 'deal');
        const isClosed = item.isOpen === false;
        const rating = formatRating(item.rating);
        const time = item.deliveryTime || '25-35 min';
        const cost =
          item.costForTwo || item.priceForTwo
            ? `₹${item.costForTwo || item.priceForTwo} for two`
            : null;
        const cuisine =
          Array.isArray(item.cuisines) && item.cuisines.length
            ? item.cuisines.slice(0, 2).join(' · ')
            : null;

        return (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() => router.push(`/restaurants/${item.id}`)}
          >
            {cover ? (
              <Image
                source={{ uri: cover }}
                style={[styles.image, isClosed && styles.imageDim]}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.image, styles.imageFallback]} />
            )}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
              locations={[0.42, 0.68, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={styles.offerWrap} pointerEvents="none">
              <LinearGradient
                colors={['#F97316', '#EA580C', '#C2410C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.offerBadge}
              >
                <Text style={styles.offerPercent}>{percent}% OFF</Text>
              </LinearGradient>
              <View style={styles.offerNotch} />
            </View>

            {isClosed ? (
              <View style={styles.statusPill} pointerEvents="none">
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Closed</Text>
              </View>
            ) : null}

            <View style={styles.bottomInfo}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.ratingPill}>
                  <Star color="#FFFFFF" size={11} fill="#FFFFFF" strokeWidth={0} />
                  <Text style={styles.ratingText}>{rating}</Text>
                </View>

                <View style={styles.metaItem}>
                  <Clock color="rgba(255,255,255,0.9)" size={12} strokeWidth={2.4} />
                  <Text style={styles.metaText}>{time}</Text>
                </View>

                {cost ? (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {cost}
                    </Text>
                  </>
                ) : null}
              </View>

              {cuisine ? (
                <Text style={styles.cuisine} numberOfLines={1}>
                  {cuisine}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 14,
  },
  card: {
    width: 280,
    height: 210,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imageFallback: {
    backgroundColor: '#334155',
  },

  offerWrap: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 7,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#EA580C',
    shadowOpacity: 0.45,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  offerPercent: {
    color: '#FFFFFF',
    fontFamily: fonts.displayBold,
    fontSize: 13,
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  offerNotch: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderTopColor: '#9A3412',
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    alignSelf: 'flex-end',
    marginBottom: -1,
  },

  imageDim: {
    opacity: 0.75,
  },
  statusPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  statusText: {
    color: '#B91C1C',
    fontFamily: fonts.uiBold,
    fontSize: 10,
  },

  bottomInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 10,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  metaRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#16A34A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    color: '#FFFFFF',
    fontFamily: fonts.uiBold,
    fontSize: 11,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: fonts.uiSemi,
    fontSize: 12,
  },
  metaDot: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: fonts.uiBold,
    fontSize: 12,
  },
  cuisine: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: fonts.uiMedium,
    fontSize: 12,
  },
});
