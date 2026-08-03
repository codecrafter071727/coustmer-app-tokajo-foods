import { Pressable } from '@/components/common/Pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
  useOrderReview,
  useSubmitRestaurantReview,
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
  const submit = useSubmitRestaurantReview(restaurantId);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

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
      await submit.mutateAsync({
        rating,
        comment: comment.trim() || undefined,
        orderId: id,
      });
      Alert.alert('Thanks!', 'Your review was submitted.', [
        { text: 'OK', onPress: () => goBackSafe(router) },
      ]);
    } catch (e) {
      Alert.alert('Could not submit', getApiErrorMessage(e));
    }
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
            {alreadyReviewed && existing.data ? (
              <View style={styles.doneCard}>
                <Text style={styles.doneTitle}>You already rated this order</Text>
                <StarRatingInput value={existing.data.rating} readonly size={26} />
                {existing.data.comment ? (
                  <Text style={styles.doneComment}>{existing.data.comment}</Text>
                ) : null}
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => goBackSafe(router)}
                >
                  <Text style={styles.secondaryBtnText}>Back to order</Text>
                </Pressable>
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
                  <Text style={styles.counter}>{comment.length}/500</Text>
                </View>

                <Pressable
                  style={[styles.submit, !canSubmit && styles.submitDisabled]}
                  disabled={!canSubmit || submit.isPending}
                  onPress={handleSubmit}
                >
                  {submit.isPending ? (
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
});
