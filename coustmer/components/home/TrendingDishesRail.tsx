import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Star } from 'lucide-react-native';
import { FlatList,
  Platform,
  
  StyleSheet,
  Text,
  View } from 'react-native';

import { authTheme } from '@/constants/auth-theme';
import type { HomeTrendingDish } from '@/lib/home/types';

type Props = {
  dishes: HomeTrendingDish[];
  onPressDish: (dish: HomeTrendingDish) => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
};

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={[styles.imageWrap, styles.skeletonBlock]} />
      <View style={[styles.skeletonLine, { width: '84%', marginTop: 10, marginHorizontal: 12 }]} />
      <View style={[styles.skeletonLine, { width: '40%', marginTop: 8, marginHorizontal: 12 }]} />
      <View style={[styles.skeletonLine, { width: '62%', marginTop: 8, marginHorizontal: 12, marginBottom: 12 }]} />
    </View>
  );
}

export function TrendingDishesRail({
  dishes,
  onPressDish,
  loading,
  title = 'Dishes to try',
  subtitle = 'Recommended picks near you',
}: Props) {
  if (!loading && !dishes.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Flame color="#FFF" size={15} fill="#FFF" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      {loading && dishes.length === 0 ? (
        <View style={styles.skeletonRow}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          horizontal
          data={dishes}
          keyExtractor={(item) => `${item.restaurantId}:${item.id}`}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          decelerationRate="fast"
          snapToInterval={164 + 14}
          snapToAlignment="start"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => {
                if (item.id.startsWith('dummy-') || item.restaurantId.startsWith('dummy-')) {
                  return;
                }
                onPressDish(item);
              }}
            >
              <View style={styles.imageWrap}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.image}
                    contentFit="cover"
                    transition={180}
                  />
                ) : (
                  <LinearGradient
                    colors={['#2D2A26', '#1A1816']}
                    style={styles.image}
                  />
                )}
                {item.badge ? (
                  <View style={styles.dishBadge}>
                    <Text style={styles.dishBadgeText} numberOfLines={1}>
                      {item.badge}
                    </Text>
                  </View>
                ) : null}
                {item.isVeg != null ? (
                  <View
                    style={[
                      styles.vegMark,
                      { borderColor: item.isVeg ? '#22C55E' : '#EF4444' },
                    ]}
                  >
                    <View
                      style={[
                        styles.vegDot,
                        { backgroundColor: item.isVeg ? '#22C55E' : '#EF4444' },
                      ]}
                    />
                  </View>
                ) : null}
                {item.rating != null && item.rating > 0 ? (
                  <View style={styles.ratingPill}>
                    <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                    <Star color="#FFF" fill="#FFF" size={9} />
                  </View>
                ) : null}
              </View>

              <Text style={styles.dishName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.price}>
                {item.price > 0 ? `₹${Math.round(item.price)}` : ' '}
              </Text>
              <Text style={styles.restaurant} numberOfLines={1}>
                {item.restaurantName}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -16,
    marginVertical: 6,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#AC0F45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: authTheme.text,
    letterSpacing: -0.35,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: authTheme.textMuted,
  },
  list: {
    paddingHorizontal: 16,
    gap: 14,
  },
  skeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 14,
  },
  card: {
    width: 164,
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.09,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  imageWrap: {
    width: '100%',
    height: 124,
    backgroundColor: '#1A1816',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dishBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    maxWidth: '70%',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  dishBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  vegMark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ratingPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1BA672',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  dishName: {
    marginTop: 10,
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '800',
    color: authTheme.text,
    lineHeight: 18,
    minHeight: 36,
    letterSpacing: -0.2,
  },
  price: {
    marginTop: 4,
    marginHorizontal: 12,
    fontSize: 15,
    fontWeight: '800',
    color: authTheme.brand,
  },
  restaurant: {
    marginTop: 4,
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: authTheme.textMuted,
  },
  skeletonBlock: {
    backgroundColor: '#EEE8E6',
  },
  skeletonLine: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#EEE8E6',
  },
});
