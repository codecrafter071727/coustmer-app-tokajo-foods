import { Sparkles } from 'lucide-react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { SuggestedItemCard } from '@/components/home/SuggestedItemCard';
import { fonts } from '@/constants/typography';
import type { HomeTrendingDish } from '@/lib/home/types';

type Props = {
  items: HomeTrendingDish[];
  onPressItem: (item: HomeTrendingDish) => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
};

function Skeleton() {
  return (
    <View style={styles.skel}>
      <View style={styles.skelImg} />
      <View style={[styles.skelLine, { width: '78%' }]} />
      <View style={[styles.skelLine, { width: '48%' }]} />
    </View>
  );
}

/** Horizontal “Suggested for you” rail — dishes sampled from nearby restaurants. */
export function SuggestedItemsRail({
  items,
  onPressItem,
  loading,
  title = 'Suggested for you',
  subtitle = 'Picks from kitchens near you',
}: Props) {
  if (!loading && !items.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Sparkles color="#FFF" size={15} fill="#FFF" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.skelRow}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </View>
      ) : (
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item) => `${item.restaurantId}:${item.id}`}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          decelerationRate="fast"
          snapToInterval={180}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SuggestedItemCard
              dish={item}
              onPress={() => onPressItem(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFF8FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#AC0F45',
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
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 6 },
  skelRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  skel: {
    width: 168,
    borderRadius: 20,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    paddingBottom: 12,
  },
  skelImg: { width: '100%', height: 140, backgroundColor: '#F1E4EA' },
  skelLine: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#F1E4EA',
    marginTop: 10,
    marginHorizontal: 12,
  },
});
