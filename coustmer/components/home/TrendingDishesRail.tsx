import { Flame, RotateCcw } from 'lucide-react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { DishRailCard, DISH_RAIL_CARD_WIDTH } from '@/components/home/DishRailCard';
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

const GAP = 14;
const SNAP = DISH_RAIL_CARD_WIDTH + GAP;

function SkeletonCard() {
  return (
    <View style={styles.skelCard}>
      <View style={styles.skelImg} />
      <View style={styles.skelBody}>
        <View style={[styles.skelLine, { width: '84%' }]} />
        <View style={[styles.skelLine, { width: '48%', marginTop: 8 }]} />
        <View style={styles.skelFooter}>
          <View style={[styles.skelLine, { width: 36, marginTop: 0 }]} />
          <View style={styles.skelAdd} />
        </View>
      </View>
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

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            isReorder ? styles.badgeReorder : styles.badgeDiscover,
          ]}
        >
          {isReorder ? (
            <RotateCcw color="#EA580C" size={16} strokeWidth={2.3} />
          ) : (
            <Flame color="#AC0F45" size={16} strokeWidth={2.2} />
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
          snapToInterval={SNAP}
          snapToAlignment="start"
          disableIntervalMomentum
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DishRailCard
              dish={item}
              reorder={isReorder}
              onPress={() => {
                if (
                  item.id.startsWith('dummy-') ||
                  item.restaurantId.startsWith('dummy-')
                ) {
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
    marginTop: 14,
    paddingTop: 4,
    paddingBottom: 8,
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
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDiscover: {
    backgroundColor: '#FFF0F4',
    borderColor: '#F8D5E0',
  },
  badgeReorder: {
    backgroundColor: '#FFF4ED',
    borderColor: '#FED7AA',
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: '#1C1C1C',
    letterSpacing: -0.4,
  },
  subtitle: { fontFamily: fonts.ui, fontSize: 13, color: '#8A8A8A' },
  list: { paddingHorizontal: 16, gap: GAP, paddingBottom: 6, paddingTop: 2 },
  skeletonRow: { flexDirection: 'row', paddingHorizontal: 16, gap: GAP },
  skelCard: {
    width: DISH_RAIL_CARD_WIDTH,
    borderRadius: 18,
    backgroundColor: '#FFF',
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EEE',
  },
  skelImg: {
    width: '100%',
    height: 132,
    borderRadius: 20,
    backgroundColor: '#EFEAE8',
  },
  skelBody: { paddingHorizontal: 4, paddingTop: 10 },
  skelLine: { height: 10, borderRadius: 5, backgroundColor: '#EFEAE8' },
  skelFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skelAdd: {
    width: 52,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EFEAE8',
  },
});
