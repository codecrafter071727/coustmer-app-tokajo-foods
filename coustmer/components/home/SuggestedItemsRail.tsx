import { Sparkles } from 'lucide-react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import {
  SuggestedItemCard,
  SUGGESTED_CARD_WIDTH,
} from '@/components/home/SuggestedItemCard';
import { fonts } from '@/constants/typography';
import type { HomeTrendingDish } from '@/lib/home/types';

type Props = {
  items: HomeTrendingDish[];
  onPressItem: (item: HomeTrendingDish) => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
};

const GAP = 14;
const SNAP = SUGGESTED_CARD_WIDTH + GAP;

function Skeleton() {
  return (
    <View style={styles.skel}>
      <View style={styles.skelImg} />
      <View style={styles.skelBody}>
        <View style={[styles.skelLine, { width: '82%' }]} />
        <View style={[styles.skelLine, { width: '54%', marginTop: 8 }]} />
        <View style={styles.skelFooter}>
          <View style={[styles.skelLine, { width: 40, marginTop: 0 }]} />
          <View style={styles.skelAdd} />
        </View>
      </View>
    </View>
  );
}

/** Horizontal “Suggested for you” — polished dish cards. */
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
          <Sparkles color="#AC0F45" size={16} strokeWidth={2.2} />
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
          snapToInterval={SNAP}
          snapToAlignment="start"
          disableIntervalMomentum
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
    marginTop: 14,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF0F4',
    borderWidth: 1,
    borderColor: '#F8D5E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: '#1C1C1C',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#8A8A8A',
  },
  list: {
    paddingHorizontal: 16,
    gap: GAP,
    paddingBottom: 8,
    paddingTop: 2,
  },
  skelRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: GAP,
  },
  skel: {
    width: SUGGESTED_CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EEE',
  },
  skelImg: {
    width: '100%',
    height: 148,
    backgroundColor: '#EFEAE8',
  },
  skelBody: {
    paddingHorizontal: 11,
    paddingTop: 10,
    paddingBottom: 12,
  },
  skelLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EFEAE8',
  },
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
