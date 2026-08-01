import { Pressable } from '@/components/common/Pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MessageSquare,
  Package,
  PackageOpen,
  PackageX,
  Timer,
  UtensilsCrossed,
} from 'lucide-react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { fonts } from '@/constants/typography';
import { useCreateTicket, useTickets } from '@/lib/customer/hooks';
import type { SupportCategory, SupportTicket } from '@/lib/customer/types';
import { useOrder } from '@/lib/order/hooks';
import { ORDER_ISSUE_TYPES } from '@/lib/order/types';

const ORANGE = '#FF6A00';
const ORANGE_SOFT = '#FFF4EC';
const INK = '#111827';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';
const WHITE = '#FFFFFF';
const BG = '#F3F4F6';
const GREEN = '#059669';

const ISSUE_ICONS: Record<
  string,
  React.ComponentType<{ color: string; size: number; strokeWidth?: number }>
> = {
  missing_item: PackageX,
  wrong_order: PackageOpen,
  quality_issue: UtensilsCrossed,
  late_delivery: Timer,
  packaging: Package,
  other: AlertTriangle,
};

/** Map UI issue chips → support ticket category */
function issueToCategory(issueType: string): SupportCategory {
  if (issueType === 'late_delivery') return 'delivery_issue';
  if (issueType === 'other') return 'other';
  return 'order_issue';
}

function formatIssueWhen(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusTone(status?: string) {
  const s = String(status ?? '').toLowerCase();
  if (s.includes('resolv') || s.includes('closed') || s.includes('done')) {
    return { bg: '#ECFDF5', text: GREEN, label: status ?? 'Resolved' };
  }
  if (s.includes('progress') || s.includes('open') || s.includes('pending')) {
    return { bg: ORANGE_SOFT, text: ORANGE, label: status ?? 'Open' };
  }
  return { bg: '#F3F4F6', text: MUTED, label: status || 'Submitted' };
}

function ticketMatchesOrder(ticket: SupportTicket, orderId: string) {
  if (!orderId) return false;
  if (ticket.orderId && String(ticket.orderId) === orderId) return true;
  // Fallback: subject/description may mention order number
  return false;
}

export function OrderIssuesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = String(
    Array.isArray(orderId) ? orderId[0] : orderId ?? ''
  ).trim();

  const order = useOrder(id);
  const ticketsQuery = useTickets();
  const createTicket = useCreateTicket();

  const [type, setType] = useState<string>(ORDER_ISSUE_TYPES[0].value);
  const [description, setDescription] = useState('');

  const resolvedOrderId = String(order.data?.id || id).trim();
  const orderLabel =
    order.data?.orderNumber || id.slice(-8).toUpperCase();
  const restaurant = order.data?.restaurantName || 'Your order';

  const typeLabel = useMemo(
    () => ORDER_ISSUE_TYPES.find((t) => t.value === type)?.label ?? type,
    [type]
  );

  const orderTickets = useMemo(() => {
    const all = ticketsQuery.data?.tickets ?? [];
    if (!resolvedOrderId) return [];
    return all.filter((t) => ticketMatchesOrder(t, resolvedOrderId));
  }, [ticketsQuery.data?.tickets, resolvedOrderId]);

  const submit = async () => {
    if (!resolvedOrderId) {
      Alert.alert(
        'Order missing',
        'Could not find this order. Go back and open Help again.'
      );
      return;
    }
    if (!type) {
      Alert.alert('Select a reason', 'Please choose what went wrong.');
      return;
    }
    if (description.trim().length < 5) {
      Alert.alert('Add details', 'Please describe what went wrong.');
      return;
    }

    const category = issueToCategory(type);
    const subject = `${typeLabel} · #${orderLabel}`;

    try {
      const ticket = await createTicket.mutateAsync({
        category,
        subject,
        description: description.trim(),
        orderId: resolvedOrderId,
      });
      setDescription('');
      Alert.alert(
        'Ticket created',
        'Our support team will look into it shortly.',
        [
          {
            text: 'View ticket',
            onPress: () =>
              router.push({
                pathname: '/support/[ticketId]',
                params: { ticketId: ticket.id },
              }),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
      void ticketsQuery.refetch();
    } catch (e) {
      Alert.alert(
        'Could not submit',
        e instanceof Error ? e.message : 'Please try again'
      );
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.circleBtn}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/orders')
          }
          hitSlop={8}
        >
          <ArrowLeft color={INK} size={20} strokeWidth={2.4} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Need help?</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {restaurant} · #{orderLabel}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 28 },
          ]}
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Report an issue</Text>
            <Text style={styles.heroSub}>
              Creates a support ticket for this order so our team can help.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>What’s wrong?</Text>
          <View style={styles.typeGrid}>
            {ORDER_ISSUE_TYPES.map((item) => {
              const selected = type === item.value;
              const Icon = ISSUE_ICONS[item.value] ?? AlertTriangle;
              return (
                <Pressable
                  key={item.value}
                  style={[styles.typeCard, selected && styles.typeCardOn]}
                  onPress={() => setType(item.value)}
                >
                  <View
                    style={[
                      styles.typeIconWrap,
                      selected && styles.typeIconWrapOn,
                    ]}
                  >
                    <Icon
                      color={selected ? ORANGE : MUTED}
                      size={18}
                      strokeWidth={2.3}
                    />
                  </View>
                  <Text
                    style={[styles.typeLabel, selected && styles.typeLabelOn]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Details · {typeLabel}</Text>
            <TextInput
              style={styles.input}
              multiline
              placeholder="Describe the issue clearly so we can help faster…"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>

            <Pressable
              style={[
                styles.submitBtn,
                createTicket.isPending && styles.disabled,
              ]}
              onPress={submit}
              disabled={createTicket.isPending}
            >
              {createTicket.isPending ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.submitText}>Submit ticket</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.historyHead}>
            <Text style={styles.sectionLabel}>Tickets for this order</Text>
            {orderTickets.length ? (
              <Text style={styles.countPill}>{orderTickets.length}</Text>
            ) : null}
          </View>

          {ticketsQuery.isLoading ? (
            <LoadingView label="Loading tickets…" />
          ) : ticketsQuery.isError ? (
            <ErrorView
              message={
                ticketsQuery.error instanceof Error
                  ? ticketsQuery.error.message
                  : 'Failed to load tickets'
              }
              onRetry={() => void ticketsQuery.refetch()}
            />
          ) : !orderTickets.length ? (
            <View style={styles.emptyCard}>
              <CheckCircle2 color={GREEN} size={28} strokeWidth={2.2} />
              <Text style={styles.emptyTitle}>No tickets yet</Text>
              <Text style={styles.emptySub}>
                If something goes wrong with this order, report it here.
              </Text>
            </View>
          ) : (
            orderTickets.map((ticket) => {
              const tone = statusTone(ticket.status);
              return (
                <Pressable
                  key={ticket.id}
                  style={styles.issueCard}
                  onPress={() =>
                    router.push({
                      pathname: '/support/[ticketId]',
                      params: { ticketId: ticket.id },
                    })
                  }
                >
                  <View style={styles.issueTop}>
                    <Text style={styles.issueType} numberOfLines={1}>
                      {ticket.subject || 'Support ticket'}
                    </Text>
                    <View
                      style={[styles.statusChip, { backgroundColor: tone.bg }]}
                    >
                      <Text style={[styles.statusText, { color: tone.text }]}>
                        {tone.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.issueDesc} numberOfLines={3}>
                    {ticket.description}
                  </Text>
                  <View style={styles.issueMeta}>
                    <Clock3 color={MUTED} size={13} strokeWidth={2.3} />
                    <Text style={styles.metaText}>
                      {formatIssueWhen(ticket.createdAt)}
                    </Text>
                    <MessageSquare color={MUTED} size={13} strokeWidth={2.3} />
                    <Text style={styles.metaText}>
                      {(ticket.messages?.length ?? 0) + 1} msgs
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: INK,
  },
  headerSub: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  hero: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: INK,
    letterSpacing: -0.3,
  },
  heroSub: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
    lineHeight: 19,
  },
  sectionLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: INK,
    marginTop: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '31%',
    minWidth: '30%',
    flexGrow: 1,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: LINE,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  typeCardOn: {
    borderColor: ORANGE,
    backgroundColor: ORANGE_SOFT,
  },
  typeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconWrapOn: {
    backgroundColor: WHITE,
  },
  typeLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 14,
  },
  typeLabelOn: {
    color: ORANGE,
    fontFamily: fonts.uiBold,
  },
  formCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
    gap: 10,
  },
  formLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: MUTED,
    letterSpacing: 0.2,
  },
  input: {
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 14,
    padding: 12,
    textAlignVertical: 'top',
    color: INK,
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: '#FAFAFA',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontFamily: fonts.ui,
    fontSize: 11,
    color: MUTED,
    marginTop: -4,
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  disabled: { opacity: 0.65 },
  submitText: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: WHITE,
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  countPill: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: ORANGE,
    backgroundColor: ORANGE_SOFT,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: INK,
  },
  emptySub: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  issueCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    padding: 14,
    gap: 8,
  },
  issueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  issueType: {
    flex: 1,
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: INK,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  issueDesc: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
  },
  issueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: MUTED,
    marginRight: 8,
  },
});
