import { Pressable } from '@/components/common/Pressable';
import { SlidersHorizontal } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type FilterChip = {
  id: string;
  label: string;
  active?: boolean;
};

type Props = {
  onFiltersPress: () => void;
  activeCount?: number;
  quickFilters?: FilterChip[];
  onQuickFilterPress?: (id: string) => void;
};

const DEFAULT_QUICK = [
  { id: 'near', label: 'Near' },
  { id: 'fast', label: 'Fast Delivery' },
  { id: 'rating', label: 'Top Rated' },
  { id: 'offers', label: 'Offers' },
];

export function HomeFilterChips({
  onFiltersPress,
  activeCount = 0,
  quickFilters = DEFAULT_QUICK,
  onQuickFilterPress,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    >
      <Pressable style={styles.filterBtn} onPress={onFiltersPress}>
        <SlidersHorizontal color="#475569" size={16} strokeWidth={2.2} />
        <Text style={styles.filterText}>Filters</Text>
        {activeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeCount}</Text>
          </View>
        )}
      </Pressable>

      {quickFilters.map((f) => (
        <Pressable
          key={f.id}
          style={[styles.chip, f.active && styles.chipActive]}
          onPress={() => onQuickFilterPress?.(f.id)}
        >
          <Text style={[styles.chipText, f.active && styles.chipTextActive]}>
            {f.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 4,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF4757',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FF4757',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FF4757',
  },
});
