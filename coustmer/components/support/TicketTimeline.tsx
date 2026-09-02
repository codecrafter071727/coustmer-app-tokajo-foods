import { StyleSheet, Text, View, Image } from 'react-native';

import { authTheme } from '@/constants/auth-theme';
import type { SupportTicket } from '@/lib/support/types';

function formatMsgTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function senderLabel(role?: string): string {
  const r = String(role ?? '').toLowerCase();
  if (r === 'agent' || r === 'admin' || r === 'support') return 'Support';
  if (r === 'system') return 'System';
  return 'You';
}

type TimelineItem = {
  key: string;
  kind: 'opened' | 'message' | 'resolved';
  role?: string;
  content: string;
  at?: string;
  attachments?: string[];
};

function buildTimeline(ticket: SupportTicket): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      key: 'opened',
      kind: 'opened',
      content: ticket.description,
      at: ticket.createdAt,
      attachments: ticket.attachments,
    },
  ];
  for (const msg of ticket.messages) {
    items.push({
      key: msg.id,
      kind: 'message',
      role: msg.senderRole,
      content: msg.content,
      at: msg.createdAt,
      attachments: msg.attachments,
    });
  }
  if (ticket.resolvedAt || ticket.resolution) {
    items.push({
      key: 'resolved',
      kind: 'resolved',
      content: ticket.resolution || 'Ticket marked resolved',
      at: ticket.resolvedAt || ticket.updatedAt,
    });
  }
  return items;
}

function AttachmentRow({ urls }: { urls?: string[] }) {
  const list = (urls ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <View style={styles.shots}>
      {list.map((url) => (
        <Image key={url} source={{ uri: url }} style={styles.shot} />
      ))}
    </View>
  );
}

export function TicketTimeline({ ticket }: { ticket: SupportTicket }) {
  const timeline = buildTimeline(ticket);

  return (
    <View style={styles.timeline}>
      {timeline.map((item, index) => {
        const isLast = index === timeline.length - 1;
        const isYou =
          item.kind === 'opened' ||
          (item.kind === 'message' &&
            String(item.role).toLowerCase() === 'customer');
        const isSystem =
          item.kind === 'resolved' ||
          String(item.role).toLowerCase() === 'system';
        return (
          <View key={item.key} style={styles.tlRow}>
            <View style={styles.tlRail}>
              <View
                style={[
                  styles.tlDot,
                  isYou && styles.tlDotYou,
                  isSystem && styles.tlDotSystem,
                ]}
              />
              {!isLast ? <View style={styles.tlLine} /> : null}
            </View>
            <View
              style={[
                styles.tlCard,
                isYou && styles.tlCardYou,
                isSystem && styles.tlCardSystem,
              ]}
            >
              <View style={styles.tlHeader}>
                <Text style={styles.tlSender}>
                  {item.kind === 'opened'
                    ? 'You opened this ticket'
                    : item.kind === 'resolved'
                      ? 'Resolved'
                      : senderLabel(item.role)}
                </Text>
                {item.at ? (
                  <Text style={styles.tlTime}>{formatMsgTime(item.at)}</Text>
                ) : null}
              </View>
              {item.content ? (
                <Text style={[styles.tlBody, isYou && styles.tlBodyYou]}>
                  {item.content}
                </Text>
              ) : null}
              <AttachmentRow urls={item.attachments} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: { gap: 0 },
  tlRow: { flexDirection: 'row', gap: 12, minHeight: 64 },
  tlRail: { width: 16, alignItems: 'center' },
  tlDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: authTheme.brand,
    marginTop: 4,
  },
  tlDotYou: { backgroundColor: authTheme.brand },
  tlDotSystem: { backgroundColor: '#9CA3AF' },
  tlLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  tlCard: {
    flex: 1,
    backgroundColor: authTheme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    padding: 12,
    marginBottom: 12,
  },
  tlCardYou: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  tlCardSystem: { backgroundColor: '#F3F4F6' },
  tlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  tlSender: {
    fontSize: 12,
    fontWeight: '700',
    color: authTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tlTime: { fontSize: 11, color: '#9CA3AF' },
  tlBody: { fontSize: 14, lineHeight: 20, color: authTheme.text },
  tlBodyYou: { color: '#1C1C1C' },
  shots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  shot: { width: 72, height: 72, borderRadius: 10 },
});
