import { Pressable } from '@/components/common/Pressable';
import { useLocalSearchParams } from 'expo-router';
import { Camera, Send, Star, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { TicketTimeline } from '@/components/support/TicketTimeline';
import { ticketDetailStyles as styles } from '@/components/support/ticket-detail-styles';
import { authTheme } from '@/constants/auth-theme';
import { getApiErrorMessage } from '@/lib/errors';
import { supportApi } from '@/lib/support/support-api';
import {
  supportKeys,
  useAddTicketMessage,
  useCloseTicket,
  useRateTicket,
  useReopenTicket,
  useSupportTicket,
} from '@/lib/support/support-hooks';
import { SUPPORT_CATEGORY_LABELS } from '@/lib/support/types';
import { useSupportTicketSocket } from '@/lib/socket/hooks';

export default function TicketDetailScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const id = String(ticketId ?? '');

  const { data: ticket, isLoading, isError, error, refetch } =
    useSupportTicket(id);
  const queryClient = useQueryClient();
  useSupportTicketSocket(id, () => {
    void queryClient.invalidateQueries({ queryKey: supportKeys.ticket(id) });
    void queryClient.invalidateQueries({ queryKey: supportKeys.tickets() });
  });
  const addMessage = useAddTicketMessage(id);
  const rateTicket = useRateTicket(id);
  const closeTicket = useCloseTicket(id);
  const reopenTicket = useReopenTicket(id);

  const [message, setMessage] = useState('');
  const [replyShot, setReplyShot] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const pickReplyShot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setReplyShot(result.assets[0].uri);
    }
  };

  const handleSend = async () => {
    if (message.trim().length === 0 && !replyShot) return;
    setSendError(null);
    try {
      const attachments: string[] = [];
      if (replyShot) {
        attachments.push(await supportApi.uploadAttachment(replyShot));
      }
      await addMessage.mutateAsync({
        content: message.trim() || '(screenshot)',
        ...(attachments.length ? { attachments } : {}),
      });
      setMessage('');
      setReplyShot(null);
    } catch (e) {
      setSendError(getApiErrorMessage(e));
    }
  };

  const isResolved =
    ticket?.status === 'resolved' || ticket?.status === 'closed';
  const alreadyRated = typeof ticket?.rating === 'number';
  const canReply = Boolean(ticket && ticket.status !== 'closed');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <ScreenHeader
            title={ticket?.ticketNo || ticket?.subject || 'Ticket'}
            subtitle={
              ticket
                ? `${SUPPORT_CATEGORY_LABELS[ticket.category] ?? ticket.category} · ${ticket.status.replace(/_/g, ' ')}`
                : undefined
            }
          />

          {isLoading ? (
            <LoadingView label="Loading ticket…" />
          ) : isError || !ticket ? (
            <ErrorView
              message={getApiErrorMessage(error, 'Failed to load ticket')}
              onRetry={refetch}
            />
          ) : (
            <>
              <ScrollView
                style={styles.flex}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
              >
                <View style={styles.metaCard}>
                  <Text style={styles.subject}>{ticket.subject}</Text>
                  {ticket.orderId ? (
                    <Text style={styles.metaLine}>
                      Order · …{ticket.orderId.slice(-8).toUpperCase()}
                    </Text>
                  ) : null}
                  {ticket.refundId ? (
                    <Text style={styles.refundLine}>
                      Refund initiated · …{ticket.refundId.slice(-8)}
                    </Text>
                  ) : null}
                  {ticket.compensationAmount ? (
                    <Text style={styles.compLine}>
                      ₹{ticket.compensationAmount} credited to your wallet
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.conversationLabel}>Timeline</Text>
                <TicketTimeline ticket={ticket} />

                {isResolved ? (
                  <View style={styles.rateCard}>
                    <Text style={styles.rateTitle}>
                      {alreadyRated ? 'Your rating' : 'Rate this support'}
                    </Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const filled =
                          (alreadyRated ? ticket.rating! : rating) >= star;
                        return (
                          <Pressable
                            key={star}
                            onPress={() => !alreadyRated && setRating(star)}
                            disabled={alreadyRated}
                            hitSlop={4}
                          >
                            <Star
                              color={authTheme.brand}
                              fill={filled ? authTheme.brand : 'transparent'}
                              size={30}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                    {!alreadyRated ? (
                      <>
                        <TextInput
                          style={styles.feedbackInput}
                          value={feedback}
                          onChangeText={setFeedback}
                          placeholder="Optional feedback…"
                          placeholderTextColor={authTheme.textDim}
                          multiline
                        />
                        <Pressable
                          style={[
                            styles.rateButton,
                            (rating === 0 || rateTicket.isPending) &&
                              styles.rateDisabled,
                          ]}
                          onPress={() => {
                            if (rating === 0) return;
                            rateTicket.mutate(
                              {
                                rating,
                                feedback: feedback.trim() || undefined,
                              },
                              {
                                onError: (e) =>
                                  Alert.alert(
                                    'Rating failed',
                                    getApiErrorMessage(e)
                                  ),
                              }
                            );
                          }}
                          disabled={rating === 0 || rateTicket.isPending}
                        >
                          <Text style={styles.rateButtonText}>
                            {rateTicket.isPending
                              ? 'Submitting…'
                              : 'Submit rating'}
                          </Text>
                        </Pressable>
                      </>
                    ) : ticket.feedback ? (
                      <Text style={styles.feedbackText}>
                        “{ticket.feedback}”
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {isResolved ? (
                  <View style={styles.reopenCard}>
                    <Text style={styles.reopenTitle}>Still need help?</Text>
                    <TextInput
                      style={styles.feedbackInput}
                      value={reopenReason}
                      onChangeText={setReopenReason}
                      placeholder="Why are you reopening this ticket?"
                      placeholderTextColor={authTheme.textDim}
                      multiline
                    />
                    <Pressable
                      style={styles.reopenBtn}
                      onPress={() => {
                        const reason = reopenReason.trim();
                        if (reason.length < 5) {
                          Alert.alert(
                            'Reason needed',
                            'Please tell us why you are reopening (min 5 characters).'
                          );
                          return;
                        }
                        reopenTicket.mutate(reason, {
                          onSuccess: () => setReopenReason(''),
                          onError: (e) =>
                            Alert.alert(
                              'Failed',
                              getApiErrorMessage(e, 'Could not reopen ticket')
                            ),
                        });
                      }}
                      disabled={reopenTicket.isPending}
                    >
                      <Text style={styles.reopenText}>
                        {reopenTicket.isPending
                          ? 'Reopening…'
                          : 'Reopen ticket'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </ScrollView>

              {!isResolved ? (
                <Pressable
                  style={styles.closeTicketBtn}
                  onPress={() =>
                    closeTicket.mutate(undefined, {
                      onError: (e) =>
                        Alert.alert('Failed', getApiErrorMessage(e)),
                    })
                  }
                  disabled={closeTicket.isPending}
                >
                  <Text style={styles.closeTicketText}>
                    {closeTicket.isPending ? 'Closing…' : 'Mark as resolved'}
                  </Text>
                </Pressable>
              ) : null}

              {canReply ? (
                <View style={styles.inputBar}>
                  {sendError ? (
                    <Text style={styles.sendError}>{sendError}</Text>
                  ) : null}
                  {replyShot ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Image
                        source={{ uri: replyShot }}
                        style={{ width: 56, height: 56, borderRadius: 8 }}
                      />
                      <Pressable onPress={() => setReplyShot(null)}>
                        <X color={authTheme.textMuted} size={18} />
                      </Pressable>
                    </View>
                  ) : null}
                  <View style={styles.inputRow}>
                    <Pressable
                      onPress={() => void pickReplyShot()}
                      style={{ paddingHorizontal: 6, justifyContent: 'center' }}
                    >
                      <Camera color={authTheme.brand} size={20} />
                    </Pressable>
                    <TextInput
                      style={styles.messageInput}
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Type a message…"
                      placeholderTextColor={authTheme.textDim}
                      multiline
                    />
                    <Pressable
                      style={styles.sendButton}
                      onPress={() => void handleSend()}
                      disabled={
                        addMessage.isPending ||
                        (message.trim().length === 0 && !replyShot)
                      }
                    >
                      {addMessage.isPending ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Send color="#FFFFFF" size={18} />
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

