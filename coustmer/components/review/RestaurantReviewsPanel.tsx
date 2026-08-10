import { Pressable } from '@/components/common/Pressable';
import { MessageSquareQuote, Star } from 'lucide-react-native';
import { ActivityIndicator,
  
  StyleSheet,
  Text,
  View } from 'react-native';

import { StarRatingInput } from '@/components/review/StarRatingInput';
import { authTheme } from '@/constants/auth-theme';
import { useRestaurantRatings } from '@/lib/restaurant/hooks';
import {
  useRestaurantReviewStats,
  useRestaurantReviews,
} from '@/lib/review/hooks';
import type { RestaurantReview } from '@/lib/review/types';

type Props = {
  restaurantId: string;
};

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ReviewCard({ review }: { review: RestaurantReview }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(review.userName ?? 'G').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>
            {review.userName?.trim() || 'Guest'}
          </Text>
          <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
        </View>
        <View style={styles.ratingChip}>
          <Star color="#FFFFFF" fill="#FFFFFF" size={11} />
          <Text style={styles.ratingChipText}>
            {review.rating.toFixed(1)}
          </Text>
        </View>
      </View>
      {review.title ? <Text style={styles.title}>{review.title}</Text> : null}
      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}
      {review.reply?.text ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>
            {review.reply.repliedBy?.trim() || 'Restaurant'} replied
          </Text>
          <Text style={styles.replyText}>{review.reply.text}</Text>
          {review.reply.repliedAt ? (
            <Text style={styles.replyDate}>
              {formatDate(review.reply.repliedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function RestaurantReviewsPanel({ restaurantId }: Props) {
  const histogram = useRestaurantRatings(restaurantId);
  const stats = useRestaurantReviewStats(restaurantId);
  const reviews = useRestaurantReviews(restaurantId, { page: 1, limit: 20 });

  const avg =
    histogram.data && histogram.data.avgRating > 0
      ? histogram.data.avgRating
      : stats.data?.average ?? 0;
  const total =
    histogram.data && histogram.data.totalRatings > 0
      ? histogram.data.totalRatings
      : stats.data?.total ?? reviews.data?.reviews.length ?? 0;
  const distribution = histogram.data?.breakdown ?? stats.data?.distribution;
  const maxDist = distribution
    ? Math.max(1, ...Object.values(distribution))
    : 1;

  if (histogram.isLoading && stats.isLoading && reviews.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={authTheme.brand} />
        <Text style={styles.muted}>Loading reviews…</Text>
      </View>
    );
  }

  if (stats.isError && reviews.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn&apos;t load reviews</Text>
        <Text style={styles.muted}>
          {stats.error instanceof Error
            ? stats.error.message
            : 'Please try again'}
        </Text>
        <Pressable
          style={styles.retry}
          onPress={() => {
            histogram.refetch();
            stats.refetch();
            reviews.refetch();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const list = reviews.data?.reviews ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.statsCard}>
        <View style={styles.avgBlock}>
          <Text style={styles.avgValue}>
            {avg > 0 ? avg.toFixed(1) : '-'}
          </Text>
          <StarRatingInput value={avg} readonly size={16} />
          <Text style={styles.avgCount}>
            {total} review{total === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.bars}>
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = distribution?.[star] ?? 0;
            const ratio = Math.max(0, Math.min(1, count / maxDist));
            return (
              <View key={star} style={styles.barRow}>
                <Text style={styles.barLabel}>{star}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, { flex: ratio || 0.0001 }]}
                  />
                  <View style={{ flex: Math.max(0.0001, 1 - ratio) }} />
                </View>
                <Text style={styles.barCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {reviews.isLoading ? (
        <ActivityIndicator color={authTheme.brand} style={{ marginTop: 16 }} />
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <MessageSquareQuote color={authTheme.textDim} size={36} />
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.muted}>
            Be the first to rate this restaurant after your order.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
    paddingHorizontal: 24,
  },
  muted: {
    color: authTheme.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorTitle: {
    color: authTheme.error,
    fontWeight: '700',
    fontSize: 15,
  },
  retry: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: authTheme.brand,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  statsCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: authTheme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    padding: 16,
  },
  avgBlock: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  avgValue: {
    fontSize: 36,
    fontWeight: '900',
    color: authTheme.text,
  },
  avgCount: {
    fontSize: 11,
    fontWeight: '600',
    color: authTheme.textMuted,
    textAlign: 'center',
  },
  bars: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    width: 12,
    fontSize: 11,
    fontWeight: '700',
    color: authTheme.textMuted,
  },
  barTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#F59E0B',
  },
  barCount: {
    width: 22,
    fontSize: 10,
    fontWeight: '600',
    color: authTheme.textDim,
    textAlign: 'right',
  },
  list: {
    marginTop: 14,
  },
  card: {
    backgroundColor: authTheme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: authTheme.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: authTheme.brand,
    fontWeight: '800',
    fontSize: 14,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    color: authTheme.text,
  },
  date: {
    marginTop: 1,
    fontSize: 11,
    color: authTheme.textDim,
    fontWeight: '600',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#16A34A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingChipText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  title: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: authTheme.text,
  },
  comment: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: authTheme.textMuted,
  },
  replyBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: authTheme.brand,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: authTheme.text,
    marginBottom: 4,
  },
  replyText: {
    fontSize: 13,
    lineHeight: 18,
    color: authTheme.textMuted,
  },
  replyDate: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: authTheme.textDim,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: authTheme.text,
  },
});
