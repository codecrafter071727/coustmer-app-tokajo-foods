import { Pressable } from '@/components/common/Pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { StarRatingInput } from '@/components/review/StarRatingInput';
import { authTheme } from '@/constants/auth-theme';
import { getApiErrorMessage } from '@/lib/errors';
import { useOrder } from '@/lib/order/hooks';
import { canRateOrder } from '@/lib/order/types';
import {
  useDeleteRestaurantReview,
  useOrderReview,
  useReportRestaurantReview,
  useSubmitOrderReview,
  useUpdateRestaurantReview,
} from '@/lib/review/hooks';

const RATING_LABELS = ['', 'Poor', 'Okay', 'Good', 'Great', 'Excellent'];

function goBackSafe(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) router.back();
  else router.replace('/orders');
}

export function SubmitReviewScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = String(orderId ?? '');

  const order = useOrder(id);
  const existing = useOrderReview(id, {
    enabled: Boolean(id) && canRateOrder(order.data?.status),
  });
  const restaurantId = String(order.data?.restaurantId ?? '');
  const submitOrderReview = useSubmitOrderReview(id);
  const reviewId = String(existing.data?.id ?? '');
  const updateReview = useUpdateRestaurantReview(restaurantId, reviewId);
  const deleteReview = useDeleteRestaurantReview(restaurantId, reviewId);
  const reportReview = useReportRestaurantReview(restaurantId, reviewId);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photosInput, setPhotosInput] = useState('');
  const [dishThumbs, setDishThumbs] = useState<Record<string, 1 | -1>>({});

  useEffect(() => {
    if (!existing.data) return;
    setRating(Math.max(1, Math.min(5, Number(existing.data.rating || 5))));
    setComment(existing.data.comment ?? '');
    setPhotosInput((existing.data.photos ?? []).join(', '));
  }, [existing.data]);

  const parsedPhotos = useMemo(
    () =>
      photosInput
        .split(',')
        .map((url) => url.trim())
        .filter((url) => /^https?:\/\//i.test(url)),
    [photosInput]
  );

  const alreadyReviewed = Boolean(existing.data);
  const canSubmit = useMemo(
    () =>
      Boolean(restaurantId) &&
      canRateOrder(order.data?.status) &&
      !alreadyReviewed &&
      rating >= 1,
    [restaurantId, order.data?.status, alreadyReviewed, rating]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const dishes = Object.entries(dishThumbs)
        .map(([itemId, thumb]) => ({
          itemId,
          // API expects 1–5 stars; thumbs map to 5 / 1
          rating: thumb === 1 ? 5 : 1,
        }))
        .filter((d) => Boolean(d.itemId) && !d.itemId.startsWith('undefined'));

      await submitOrderReview.mutateAsync({
        restaurantId,
        rating,
        comment: comment.trim() || undefined,
        photos: parsedPhotos.length ? parsedPhotos : undefined,
        packagingRating: rating,
        dishes: dishes.length ? dishes : undefined,
      });
      Alert.alert('Thanks!', 'Your review was submitted.', [
        { text: 'OK', onPress: () => goBackSafe(router) },
      ]);
    } catch (e) {
      Alert.alert('Could not submit', getApiErrorMessage(e));
    }
  };

  const handleUpdate = async () => {
    if (!alreadyReviewed || !reviewId) return;
    try {
      await updateReview.mutateAsync({
        rating,
        comment: comment.trim() || undefined,
        orderId: id,
        photos: parsedPhotos.length ? parsedPhotos : undefined,
      });
      Alert.alert('Updated', 'Your review has been updated.');
      void existing.refetch();
    } catch (e) {
      Alert.alert('Could not update', getApiErrorMessage(e));
    }
  };

  const handleDelete = () => {
    if (!alreadyReviewed || !reviewId) return;
    Alert.alert('Delete review?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReview.mutateAsync();
            Alert.alert('Deleted', 'Your review has been deleted.');
            void existing.refetch();
            setComment('');
            setRating(5);
          } catch (e) {
            Alert.alert('Could not delete', getApiErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (order.isLoading || existing.isLoading) {
    return <LoadingView label="Loading…" />;
  }

  if (order.isError || !order.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Rate order" />
        <ErrorView
          message={
            order.error instanceof Error
              ? order.error.message
              : 'Order not found'
          }
          onRetry={() => order.refetch()}
        />
      </SafeAreaView>
    );
  }

  const restaurantName = order.data.restaurantName || 'this restaurant';
  const currentReview = existing.data ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <ScreenHeader title="Rate your order" subtitle={restaurantName} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {alreadyReviewed && currentReview ? (
              <View style={styles.doneCard}>
                <Text style={styles.doneTitle}>You already rated this order</Text>
                <StarRatingInput value={currentReview.rating} readonly size={26} />
                {currentReview.comment ? (
                  <Text style={styles.doneComment}>{currentReview.comment}</Text>
                ) : null}
                <View style={styles.card}>
                  <Text style={styles.label}>Edit your review</Text>
                  <View style={styles.starsWrap}>
                    <StarRatingInput value={rating} onChange={setRating} size={32} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Update your feedback..."
                    placeholderTextColor={authTheme.textDim}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <TextInput
                    style={[styles.input, { minHeight: 70, marginTop: 10 }]}
                    value={photosInput}
                    onChangeText={setPhotosInput}
                    placeholder="Photo URLs (comma-separated, optional)"
                    placeholderTextColor={authTheme.textDim}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={styles.counter}>{comment.length}/500</Text>
                  <View style={styles.editActions}>
                    <Pressable style={styles.secondaryBtn} onPress={handleUpdate}>
                      {updateReview.isPending ? (
                        <ActivityIndicator color={authTheme.brand} />
                      ) : (
                        <Text style={styles.secondaryBtnText}>Update review</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.secondaryBtn, styles.deleteBtn]}
                      onPress={handleDelete}
                    >
                      {deleteReview.isPending ? (
                        <ActivityIndicator color="#B91C1C" />
                      ) : (
                        <Text style={styles.deleteBtnText}>Delete review</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => goBackSafe(router)}
                >
                  <Text style={styles.secondaryBtnText}>Back to order</Text>
                </Pressable>
                {reviewId ? (
                  <Pressable
                    style={[styles.secondaryBtn, { backgroundColor: '#FFF7ED' }]}
                    onPress={async () => {
                      try {
                        await reportReview.mutateAsync({ reason: 'abusive_or_spam' });
                        Alert.alert('Reported', 'Thanks, this review has been flagged.');
                      } catch (e) {
                        Alert.alert('Could not report', getApiErrorMessage(e));
                      }
                    }}
                  >
                    <Text style={[styles.secondaryBtnText, { color: '#C2410C' }]}>
                      Report this review
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : !canRateOrder(order.data.status) ? (
              <View style={styles.doneCard}>
                <Text style={styles.doneTitle}>You can rate after delivery</Text>
                <Text style={styles.hint}>
                  Reviews unlock once your order is delivered.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.label}>How was the food?</Text>
                  <View style={styles.starsWrap}>
                    <StarRatingInput
                      value={rating}
                      onChange={setRating}
                      size={36}
                    />
                  </View>
                  <Text style={styles.ratingLabel}>
                    {RATING_LABELS[rating] ?? ''}
                  </Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.label}>Tell others (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={comment}
                    onChangeText={setComment}
                    placeholder="What did you like? Packaging, taste, delivery…"
                    placeholderTextColor={authTheme.textDim}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <TextInput
                    style={[styles.input, { minHeight: 70, marginTop: 10 }]}
                    value={photosInput}
                    onChangeText={setPhotosInput}
                    placeholder="Photo URLs (comma-separated, optional)"
                    placeholderTextColor={authTheme.textDim}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={styles.counter}>{comment.length}/500</Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.label}>Rate dishes (quick thumbs)</Text>
                  {(order.data.items ?? []).slice(0, 8).map((item, idx) => {
                    const key = String(item.menuItemId || item.id || '').trim() || `idx-${idx}`;
                    const current = dishThumbs[key];
                    // Prefer menuItemId — review-service validates against order line menu ids
                    const rateKey = String(item.menuItemId || item.id || '').trim();
                    if (!rateKey) return null;
                    return (
                      <View key={key} style={styles.dishRow}>
                        <Text style={styles.dishName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.dishActions}>
                          <Pressable
                            style={[styles.dishBtn, current === 1 && styles.dishBtnUp]}
                            onPress={() =>
                              setDishThumbs((prev) => ({ ...prev, [rateKey]: 1 }))
                            }
                          >
                            <Text style={styles.dishBtnText}>👍</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.dishBtn, current === -1 && styles.dishBtnDown]}
                            onPress={() =>
                              setDishThumbs((prev) => ({ ...prev, [rateKey]: -1 }))
                            }
                          >
                            <Text style={styles.dishBtnText}>👎</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <Pressable
                  style={[styles.submit, !canSubmit && styles.submitDisabled]}
                  disabled={!canSubmit || submitOrderReview.isPending}
                  onPress={handleSubmit}
                >
                  {submitOrderReview.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>Submit review</Text>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authTheme.bg },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 4 },
  scroll: { paddingBottom: 40, gap: 14 },
  card: {
    backgroundColor: authTheme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    padding: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: authTheme.text,
    marginBottom: 12,
  },
  starsWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  ratingLabel: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: authTheme.brand,
  },
  input: {
    minHeight: 110,
    borderWidth: 1.5,
    borderColor: authTheme.inputBorder,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: authTheme.text,
    backgroundColor: authTheme.bgSoft,
  },
  counter: {
    marginTop: 8,
    alignSelf: 'flex-end',
    fontSize: 11,
    fontWeight: '600',
    color: authTheme.textDim,
  },
  submit: {
    backgroundColor: authTheme.brand,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  doneCard: {
    backgroundColor: authTheme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  doneTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: authTheme.text,
    textAlign: 'center',
  },
  doneComment: {
    fontSize: 13,
    lineHeight: 19,
    color: authTheme.textMuted,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: authTheme.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  secondaryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: authTheme.brandSoft,
  },
  secondaryBtnText: {
    color: authTheme.brand,
    fontWeight: '800',
    fontSize: 13,
  },
  editActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: {
    color: '#B91C1C',
    fontWeight: '800',
    fontSize: 13,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: authTheme.cardBorder,
  },
  dishName: {
    flex: 1,
    fontSize: 13,
    color: authTheme.text,
    fontWeight: '600',
    marginRight: 10,
  },
  dishActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dishBtn: {
    width: 36,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  dishBtnUp: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  dishBtnDown: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  dishBtnText: {
    fontSize: 14,
  },
});
