import { Flame, RotateCcw } from 'lucide-react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { DishRailCard } from '@/components/home/DishRailCard';
import { fonts } from '@/constants/typography';
import type { HomeTrendingDish } from '@/lib/home/types';

type Accent = 'discover' | 'reorder';

type Props = {
  dishes: HomeTrendingDish[];
  onPressDish: (dish: HomeTrendingDish) => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  accent?: Accent;
};

function SkeletonCard() {
  return (
    <View style={styles.skelCard}>
      <View style={styles.skelImg} />
      <View style={[styles.skelLine, { width: '84%' }]} />
      <View style={[styles.skelLine, { width: '40%' }]} />
      <View style={[styles.skelLine, { width: '62%' }]} />
    </View>
  );
}

export function TrendingDishesRail({
  dishes,
  onPressDish,
  loading,
  title = 'Dishes to try',
  subtitle = 'Recommended picks near you',
  accent = 'discover',
}: Props) {
  if (!loading && !dishes.length) return null;

  const isReorder = accent === 'reorder';
  const badgeBg = isReorder ? '#F97316' : '#AC0F45';

  return (
    <View style={[styles.wrap, isReorder && styles.wrapReorder]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          {isReorder ? (
            <RotateCcw color="#FFF" size={15} strokeWidth={2.4} />
          ) : (
            <Flame color="#FFF" size={15} fill="#FFF" />
          )}
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
          snapToInterval={168}
          snapToAlignment="start"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DishRailCard
              dish={item}
              onPress={() => {
                if (item.id.startsWith('dummy-') || item.restaurantId.startsWith('dummy-')) {
                  return;
                }
                onPressDish(item);
              }}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  wrapReorder: { backgroundColor: '#FFFBF7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: '#1C1C1C',
    letterSpacing: -0.35,
  },
  subtitle: { fontFamily: fonts.ui, fontSize: 13, color: '#8A8A8A' },
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  skeletonRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  skelCard: {
    width: 156,
    borderRadius: 18,
    backgroundColor: '#FFF',
    paddingBottom: 12,
    overflow: 'hidden',
  },
  skelImg: { width: '100%', height: 128, backgroundColor: '#EEE8E6' },
  skelLine: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#EEE8E6',
    marginTop: 8,
    marginHorizontal: 11,
  },
});
