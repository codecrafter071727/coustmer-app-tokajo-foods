import { Image } from 'expo-image';
import { Flame, Leaf, RotateCcw, Sparkles, Star, TrendingUp } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HomeRestaurantRailCard } from '@/components/home/HomeRestaurantRailCard';
import { fonts } from '@/constants/typography';
import type { HomeRailVariant, HomeRestaurantCard } from '@/lib/home/types';

type Props = {
  restaurants: HomeRestaurantCard[];
  onPressRestaurant?: (id: string) => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  variant?: HomeRailVariant;
};

const VARIANT_META: Record<
  HomeRailVariant,
  {
    Icon: ComponentType<{ color: string; size?: number }>;
    badge?: string;
    badgeColor?: string;
    accent: string;
  }
> = {
  trending: { Icon: TrendingUp, badge: 'HOT', badgeColor: '#EA580C', accent: '#EA580C' },
  new: { Icon: Sparkles, badge: 'NEW', badgeColor: '#F97316', accent: '#F97316' },
  'top-rated': { Icon: Star, badge: 'TOP', badgeColor: '#1BA672', accent: '#1BA672' },
  'pure-veg': { Icon: Leaf, badge: 'VEG', badgeColor: '#22C55E', accent: '#22C55E' },
  'order-again': { Icon: RotateCcw, accent: '#F97316' },
  'for-you': { Icon: Flame, accent: '#AC0F45' },
};

export function HomeRestaurantRail({
  restaurants,
  onPressRestaurant,
  loading,
  title = 'Restaurants',
  subtitle,
  variant = 'new',
}: Props) {
  if (!loading && (!restaurants || restaurants.length === 0)) return null;

  const meta = VARIANT_META[variant];
  const { Icon } = meta;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: `${meta.accent}18` }]}>
          <Icon color={meta.accent} size={18} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        decelerationRate="fast"
        snapToInterval={248}
      >
        {restaurants.map((r) => (
          <HomeRestaurantRailCard
            key={r.id}
            restaurant={r}
            badge={meta.badge}
            badgeColor={meta.badgeColor ?? meta.accent}
            onPress={() => onPressRestaurant?.(r.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: '#1C1C1C',
    letterSpacing: -0.3,
  },
  subtitle: { fontFamily: fonts.ui, fontSize: 13, color: '#8A8A8A' },
  list: { paddingHorizontal: 16, gap: 14 },
});
