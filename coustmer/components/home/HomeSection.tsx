import { FlatList, StyleSheet, Text, View } from 'react-native';

import { RestaurantCard } from '@/components/home/RestaurantCard';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import type { RestaurantCard as RestaurantCardType } from '@/lib/customer/types';

type Props = {
  title: string;
  subtitle?: string;
  data: RestaurantCardType[];
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
  onRestaurantPress?: (id: string) => void;
  emptyLabel?: string;
};

export function HomeSection({
  title,
  subtitle,
  data,
  favoriteIds = [],
  onToggleFavorite,
  onRestaurantPress,
  emptyLabel,
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.accentBar} />
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {emptyLabel ?? 'Nothing here yet — check back soon.'}
          </Text>
        </View>
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item, index) =>
            String(item.id ?? (item as Record<string, unknown>)._id ?? index)
          }
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const id = String(
              item.id ?? (item as Record<string, unknown>)._id ?? ''
            );
            return (
              <RestaurantCard
                restaurant={item}
                isFavorite={favoriteIds.includes(id)}
                onToggleFavorite={onToggleFavorite}
                onPress={id && onRestaurantPress ? () => onRestaurantPress(id) : undefined}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 26,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  accentBar: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: authTheme.brand,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: authTheme.text,
    fontSize: 20,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: authTheme.textMuted,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    gap: 14,
  },
  emptyCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    borderStyle: 'dashed',
    backgroundColor: authTheme.bgSoft,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: authTheme.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
