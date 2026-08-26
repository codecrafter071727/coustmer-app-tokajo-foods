import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { fonts } from '@/constants/typography';
import { restaurantClosedLabel, restaurantIsClosed } from '@/lib/restaurant/card-display';
import type { Restaurant } from '@/lib/restaurant/types';

type SurgeBadgeProps = {
  label: string;
  style?: ViewStyle;
};

export function RestaurantSurgeBadge({ label, style }: SurgeBadgeProps) {
  return (
    <View style={[styles.surgeBadge, style]}>
      <Text style={styles.surgeText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type ClosedOverlayProps = {
  restaurant: Restaurant;
};

export function RestaurantClosedOverlay({ restaurant }: ClosedOverlayProps) {
  if (!restaurantIsClosed(restaurant)) return null;
  const copy = restaurantClosedLabel(restaurant) ?? 'Currently closed';
  return (
    <View style={styles.closedScrim} pointerEvents="none">
      <View style={styles.closedPill}>
        <Text style={styles.closedLabel} numberOfLines={2}>
          {copy}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surgeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '55%',
  },
  surgeText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: '#92400E',
    letterSpacing: 0.2,
  },
  closedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  closedPill: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: '92%',
  },
  closedLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#0F172A',
    textAlign: 'center',
  },
});
