import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Star } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { VegMarkIcon } from '@/components/home/VegMarkIcon';
import { fonts } from '@/constants/typography';
import type { HomeRestaurantCard } from '@/lib/home/types';

type Props = {
  restaurant: HomeRestaurantCard;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
};

const CARD_W = 228;
const IMG_RADIUS = 18;

/** Swiggy-style restaurant rail card — rounded photo, rating chip, clean meta. */
export function HomeRestaurantRailCard({
  restaurant: r,
  badge,
  badgeColor,
  onPress,
}: Props) {
  const closed = Boolean(r.availabilityLabel);
  const hasRating = typeof r.rating === 'number' && r.rating > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.imgWrap}>
        {r.image ? (
          <Image
            source={{ uri: r.image }}
            style={styles.img}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.img, styles.imgFallback]} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={styles.fade}
        />

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

        {hasRating && !closed ? (
          <View style={styles.ratingOnImg}>
            <Text style={styles.ratingOnImgText}>{r.rating!.toFixed(1)}</Text>
            <Star color="#FFF" fill="#FFF" size={9} />
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
          {r.deliveryTime && !closed ? (
            <View style={styles.time}>
              <Clock color="#6B7280" size={12} strokeWidth={2.2} />
              <Text style={styles.timeText}>{r.deliveryTime}</Text>
            </View>
          ) : null}
          {typeof r.reviewCount === 'number' && r.reviewCount > 0 ? (
            <Text style={styles.reviewCount}>
              {r.reviewCount >= 1000
                ? `${(r.reviewCount / 1000).toFixed(r.reviewCount >= 10000 ? 0 : 1).replace(/\.0$/, '')}K+`
                : r.reviewCount}{' '}
              ratings
            </Text>
          ) : null}
        </View>

        {r.cuisines && r.cuisines.length > 0 ? (
          <Text style={styles.cuisines} numberOfLines={1}>
            {r.cuisines.slice(0, 3).join(' • ')}
          </Text>
        ) : null}

        {closed && r.availabilityLabel ? (
          <Text style={styles.hoursClosed} numberOfLines={1}>
            {r.availabilityLabel}
          </Text>
        ) : r.hoursToday ? (
          <Text style={styles.hours} numberOfLines={1}>
            {r.hoursToday}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export const RESTAURANT_RAIL_CARD_WIDTH = CARD_W;

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.11,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  pressed: { opacity: 0.96, transform: [{ scale: 0.985 }] },
  imgWrap: {
    height: 128,
    borderRadius: IMG_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#EDE9E6',
    position: 'relative',
  },
  img: { width: '100%', height: '100%', borderRadius: IMG_RADIUS },
  imgFallback: { backgroundColor: '#E8E4E1' },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
  },
  railBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  railBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: fonts.uiBold,
    letterSpacing: 0.7,
  },
  vegMark: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 3,
  },
  ratingOnImg: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1BA672',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  ratingOnImgText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: fonts.uiBold,
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
  info: { paddingTop: 10, paddingHorizontal: 4 },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 15.5,
    color: '#1C1C1C',
    letterSpacing: -0.25,
    marginBottom: 5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12.5, fontFamily: fonts.uiSemi, color: '#4B5563' },
  reviewCount: { fontSize: 11.5, fontFamily: fonts.ui, color: '#9CA3AF' },
  hours: {
    marginTop: 3,
    fontSize: 11.5,
    fontFamily: fonts.ui,
    color: '#9CA3AF',
  },
  hoursClosed: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: fonts.uiSemi,
    color: '#DC2626',
  },
  cuisines: {
    fontSize: 12.5,
    fontFamily: fonts.ui,
    color: '#8A8A8A',
  },
});
