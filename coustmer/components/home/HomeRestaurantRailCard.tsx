import { Image } from 'expo-image';
import { Clock, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VegMarkIcon } from '@/components/home/VegMarkIcon';
import { fonts } from '@/constants/typography';
import type { HomeRestaurantCard } from '@/lib/home/types';

type Props = {
  restaurant: HomeRestaurantCard;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
};

export function HomeRestaurantRailCard({
  restaurant: r,
  badge,
  badgeColor,
  onPress,
}: Props) {
  const closed = Boolean(r.availabilityLabel);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imgWrap}>
        {r.image ? (
          <Image source={{ uri: r.image }} style={styles.img} contentFit="cover" />
        ) : (
          <View style={[styles.img, styles.imgFallback]} />
        )}
        {badge ? (
          <View style={[styles.railBadge, { backgroundColor: badgeColor ?? '#EA580C' }]}>
            <Text style={styles.railBadgeText}>{badge}</Text>
          </View>
        ) : null}
        {r.isPureVeg ? (
          <View style={styles.vegMark}>
            <VegMarkIcon variant="veg" size={14} />
          </View>
        ) : null}
        {closed ? (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText} numberOfLines={2}>
              {r.availabilityLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {r.name}
        </Text>
        <View style={styles.meta}>
          {typeof r.rating === 'number' && r.rating > 0 ? (
            <View style={styles.rating}>
              <Star color="#1BA672" size={11} fill="#1BA672" strokeWidth={0} />
              <Text style={styles.ratingText}>{r.rating.toFixed(1)}</Text>
              {typeof r.reviewCount === 'number' && r.reviewCount > 0 ? (
                <Text style={styles.reviewCount}>
                  ({r.reviewCount >= 1000
                    ? `${(r.reviewCount / 1000).toFixed(r.reviewCount >= 10000 ? 0 : 1).replace(/\.0$/, '')}K+`
                    : r.reviewCount})
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.ratingMuted}>
              <Text style={styles.ratingMutedText}>No ratings</Text>
            </View>
          )}
          {r.deliveryTime && !closed ? (
            <View style={styles.time}>
              <Clock color="#64748B" size={12} strokeWidth={2} />
              <Text style={styles.timeText}>{r.deliveryTime}</Text>
            </View>
          ) : null}
        </View>
        {r.hoursToday || (closed && r.availabilityLabel) ? (
          <Text style={[styles.hours, closed && styles.hoursClosed]} numberOfLines={1}>
            {closed && r.availabilityLabel ? r.availabilityLabel : r.hoursToday}
          </Text>
        ) : null}
        {r.cuisines && r.cuisines.length > 0 ? (
          <Text style={styles.cuisines} numberOfLines={1}>
            {r.cuisines.slice(0, 3).join(' • ')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 232,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imgWrap: {
    height: 132,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F4F4F5',
  },
  img: { width: '100%', height: '100%' },
  imgFallback: { backgroundColor: '#F1F5F9' },
  railBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  railBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: fonts.uiBold,
    letterSpacing: 0.6,
  },
  vegMark: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 3,
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  closedText: {
    color: '#FFF',
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  info: { paddingTop: 10, paddingHorizontal: 2 },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 15.5,
    color: '#1C1C1C',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EAF6EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: { fontSize: 12.5, fontFamily: fonts.uiBold, color: '#1BA672' },
  reviewCount: { fontSize: 11, fontFamily: fonts.uiSemi, color: '#4B7A62' },
  ratingMuted: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingMutedText: { fontSize: 11, fontFamily: fonts.uiBold, color: '#64748B' },
  hours: {
    fontSize: 12,
    fontFamily: fonts.uiSemi,
    color: '#64748B',
    marginBottom: 4,
  },
  hoursClosed: { color: '#DC2626' },
  time: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 12.5, fontFamily: fonts.uiSemi, color: '#8A8A8A' },
  cuisines: { fontSize: 12.5, fontFamily: fonts.ui, color: '#9A9A9A' },
});
