import { Pressable } from '@/components/common/Pressable';
import { useLocalSearchParams } from 'expo-router';
import { Send, Star } from 'lucide-react-native';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { authTheme } from '@/constants/auth-theme';
import {
  useAddTicketMessage,
  useCloseTicket,
  useRateTicket,
  useReopenTicket,
  useTicket,
} from '@/lib/customer/hooks';
import { customerKeys } from '@/lib/customer/hooks';
import { useSupportTicketSocket } from '@/lib/socket/hooks';
import { SUPPORT_CATEGORY_LABELS } from '@/lib/customer/types';

export default function TicketDetailScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const id = String(ticketId ?? '');

  const { data: ticket, isLoading, isError, error, refetch } = useTicket(id);
  const queryClient = useQueryClient();
  useSupportTicketSocket(id, () => {
    void queryClient.invalidateQueries({ queryKey: customerKeys.ticket(id) });
    void queryClient.invalidateQueries({ queryKey: customerKeys.tickets() });
  });
  const addMessage = useAddTicketMessage(id);
  const rateTicket = useRateTicket(id);
  const closeTicket = useCloseTicket(id);
  const reopenTicket = useReopenTicket(id);

  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSend = () => {
    if (message.trim().length === 0) return;
    addMessage.mutate(
      { content: message.trim() },
      { onSuccess: () => setMessage('') }
    );
  };

  const handleRate = () => {
    if (rating === 0) return;
    rateTicket.mutate({
      rating,
      feedback: feedback.trim() || undefined,
    });
  };

  const isResolved =
    ticket?.status === 'resolved' || ticket?.status === 'closed';
  const canReopen = isResolved;
  const alreadyRated = typeof ticket?.rating === 'number';

  const handleReopen = () => {
    Alert.prompt(
      'Reopen ticket',
      'Tell us why this issue is not resolved yet.',
      (reason) => {
        if (!reason?.trim()) return;
        reopenTicket.mutate(reason.trim(), {
          onError: (e) =>
            Alert.alert(
              'Failed',
              e instanceof Error ? e.message : 'Could not reopen ticket'
            ),
        });
      }
    );
  };

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
              message={
                error instanceof Error ? error.message : 'Failed to load ticket'
              }
              onRetry={refetch}
            />
          ) : (
            <>
              <ScrollView
                style={styles.flex}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
              >
                <View style={styles.descriptionCard}>
                  <Text style={styles.descLabel}>Issue</Text>
                  <Text style={styles.descText}>{ticket.description}</Text>
                  {ticket.resolution ? (
                    <>
                      <Text style={[styles.descLabel, { marginTop: 12 }]}>Resolution</Text>
                      <Text style={styles.descText}>{ticket.resolution}</Text>
                    </>
                  ) : null}
                  {ticket.refundId ? (
                    <Text style={styles.refundLine}>Refund initiated · ref …{ticket.refundId.slice(-8)}</Text>
                  ) : null}
                  {ticket.compensationAmount ? (
                    <Text style={styles.compLine}>
                      ₹{ticket.compensationAmount} credited to your wallet
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.conversationLabel}>Conversation</Text>
                {ticket.messages.length === 0 ? (
                  <Text style={styles.emptyMessages}>
                    No replies yet. Send a message below and our team will
                    respond.
                  </Text>
                ) : (
                  ticket.messages.map((msg, index) => {
                    const isAgent = msg.senderRole && msg.senderRole !== 'customer';
                    return (
                      <View
                        key={msg.id ?? index}
                        style={[
                          styles.messageBubble,
                          isAgent ? styles.agentBubble : styles.userBubble,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            isAgent ? styles.agentText : styles.userText,
                          ]}
                        >
                          {msg.content}
                        </Text>
                      </View>
                    );
                  })
                )}

                {isResolved ? (
                  <View style={styles.rateCard}>
                    <Text style={styles.rateTitle}>
                      {alreadyRated ? 'Your rating' : 'Rate this support'}
                    </Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const filled = (alreadyRated ? ticket.rating! : rating) >= star;
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
                          onPress={handleRate}
                          disabled={rating === 0 || rateTicket.isPending}
                        >
                          <Text style={styles.rateButtonText}>
                            {rateTicket.isPending ? 'Submitting…' : 'Submit rating'}
                          </Text>
                        </Pressable>
                      </>
                    ) : ticket.feedback ? (
                      <Text style={styles.feedbackText}>“{ticket.feedback}”</Text>
                    ) : null}
                  </View>
                ) : null}
              </ScrollView>

              {!isResolved && (
                <Pressable
                  style={styles.closeTicketBtn}
                  onPress={() => closeTicket.mutate()}
                  disabled={closeTicket.isPending}
                >
                  <Text style={styles.closeTicketText}>
                    {closeTicket.isPending ? 'Closing…' : 'Mark as resolved'}
                  </Text>
                </Pressable>
              )}

              {canReopen ? (
                <Pressable
                  style={styles.reopenBtn}
                  onPress={handleReopen}
                  disabled={reopenTicket.isPending}
                >
                  <Text style={styles.reopenText}>
                    {reopenTicket.isPending ? 'Reopening…' : 'Reopen ticket'}
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.inputBar}>
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
                  onPress={handleSend}
                  disabled={addMessage.isPending || message.trim().length === 0}
                >
                  {addMessage.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Send color="#FFFFFF" size={18} />
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: authTheme.bg,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  scroll: {
    paddingBottom: 20,
  },
  descriptionCard: {
    backgroundColor: authTheme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    padding: 16,
  },
  descLabel: {
    color: authTheme.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  descText: {
    color: authTheme.text,
    fontSize: 14,
    lineHeight: 20,
  },
  refundLine: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  compLine: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  conversationLabel: {
    color: authTheme.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyMessages: {
    color: authTheme.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: authTheme.brand,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: authTheme.card,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  userText: {
    color: '#FFFFFF',
  },
  agentText: {
    color: authTheme.text,
  },
  rateCard: {
    marginTop: 20,
    backgroundColor: authTheme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    padding: 16,
  },
  rateTitle: {
    color: authTheme.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  feedbackInput: {
    backgroundColor: authTheme.input,
    borderWidth: 1.5,
    borderColor: authTheme.inputBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: authTheme.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  feedbackText: {
    color: authTheme.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  rateButton: {
    marginTop: 12,
    backgroundColor: authTheme.brand,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rateDisabled: {
    opacity: 0.6,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  closeTicketBtn: {
    marginHorizontal: 0,
    marginBottom: 8,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTicketText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  reopenBtn: {
    marginBottom: 8,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reopenText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EA580C',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: authTheme.cardBorder,
  },
  messageInput: {
    flex: 1,
    backgroundColor: authTheme.input,
    borderWidth: 1.5,
    borderColor: authTheme.inputBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 8 : 12,
    fontSize: 15,
    color: authTheme.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: authTheme.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
