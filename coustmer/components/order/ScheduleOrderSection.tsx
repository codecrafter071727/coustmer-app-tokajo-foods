import { Clock3 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { fonts } from '@/constants/typography';
import {
  formatScheduleDayLabel,
  formatScheduledForDisplay,
  formatScheduleSlotLabel,
  pickAvailableSlots,
  type ScheduleDay,
  type ScheduleSlotsResponse,
} from '@/lib/cart/schedule';

const ORANGE = '#F97316';
const ORANGE_DARK = '#EA580C';
const TEXT = '#0B1220';
const TEXT_SEC = '#64748B';
const TEXT_MUTED = '#94A3B8';
const BORDER = '#E5E7EB';
const BG_SOFT = '#FFF7ED';

type Props = {
  scheduleData: ScheduleSlotsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  scheduledFor: string | null;
  busy?: boolean;
  onSelectNow: () => void;
  onSelectSlot: (startIso: string) => void;
};

export function ScheduleOrderSection({
  scheduleData,
  isLoading,
  isError,
  scheduledFor,
  busy = false,
  onSelectNow,
  onSelectSlot,
}: Props) {
  const [mode, setMode] = useState<'now' | 'later'>(scheduledFor ? 'later' : 'now');

  const days = useMemo(() => {
    if (!scheduleData) return [] as ScheduleDay[];
    if (scheduleData.days?.length) {
      return pickAvailableSlots(scheduleData.days);
    }
    if (scheduleData.date && scheduleData.slots?.length) {
      return pickAvailableSlots([{ date: scheduleData.date, slots: scheduleData.slots }]);
    }
    return [];
  }, [scheduleData]);

  const [selectedDate, setSelectedDate] = useState<string | null>(days[0]?.date ?? null);

  useEffect(() => {
    if (!days.length) return;
    if (!selectedDate || !days.some((d) => d.date === selectedDate)) {
      setSelectedDate(days[0]!.date);
    }
  }, [days, selectedDate]);

  const activeDay = days.find((d) => d.date === selectedDate) ?? days[0] ?? null;
  const selectedIso = scheduledFor;
  const displayScheduled = formatScheduledForDisplay(selectedIso);

  const unsupported = scheduleData?.scheduleSupported === false;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Clock3 color={ORANGE} size={16} strokeWidth={2.2} />
        <Text style={styles.title}>Schedule order</Text>
      </View>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeChip, mode === 'now' && styles.modeChipOn]}
          onPress={() => {
            setMode('now');
            onSelectNow();
          }}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={[styles.modeChipText, mode === 'now' && styles.modeChipTextOn]}>
            Deliver now
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeChip,
            mode === 'later' && styles.modeChipOn,
            unsupported && styles.modeChipDisabled,
          ]}
          onPress={() => !unsupported && setMode('later')}
          disabled={busy || unsupported}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.modeChipText,
              mode === 'later' && styles.modeChipTextOn,
              unsupported && styles.modeChipTextDisabled,
            ]}
          >
            Schedule
          </Text>
        </TouchableOpacity>
      </View>

      {unsupported ? (
        <Text style={styles.hint}>
          This restaurant does not accept scheduled orders right now.
        </Text>
      ) : mode === 'later' ? (
        <>
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={ORANGE} size="small" />
              <Text style={styles.hint}>Loading available slots…</Text>
            </View>
          ) : isError ? (
            <Text style={styles.hintError}>
              Could not load slots. Pull to refresh and try again.
            </Text>
          ) : days.length === 0 ? (
            <Text style={styles.hint}>
              No delivery slots in the next 7 days. Try again later or choose Deliver now.
            </Text>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateRow}
              >
                {days.map((day) => {
                  const active = (activeDay?.date ?? day.date) === day.date;
                  return (
                    <TouchableOpacity
                      key={day.date}
                      style={[styles.dateChip, active && styles.dateChipOn]}
                      onPress={() => setSelectedDate(day.date)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.dateChipText, active && styles.dateChipTextOn]}>
                        {formatScheduleDayLabel(day.date)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.slotGrid}>
                {(activeDay?.slots ?? []).map((slot) => {
                  const active = selectedIso === slot.startIso;
                  return (
                    <TouchableOpacity
                      key={slot.startIso}
                      style={[styles.slotChip, active && styles.slotChipOn]}
                      onPress={() => onSelectSlot(slot.startIso)}
                      disabled={busy || !slot.available}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.slotChipText, active && styles.slotChipTextOn]}>
                        {formatScheduleSlotLabel(slot.start, slot.end)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </>
      ) : (
        <Text style={styles.hint}>Your order will be prepared and dispatched immediately.</Text>
      )}

      {displayScheduled && mode === 'later' ? (
        <View style={styles.selectedBox}>
          <Text style={styles.selectedLabel}>Scheduled for</Text>
          <Text style={styles.selectedValue}>{displayScheduled}</Text>
        </View>
      ) : null}

      {busy ? (
        <Text style={styles.hint}>Saving schedule…</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.uiSemi,
    fontSize: 16,
    color: TEXT,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  modeChipOn: {
    borderColor: ORANGE,
    backgroundColor: BG_SOFT,
  },
  modeChipDisabled: {
    opacity: 0.55,
  },
  modeChipText: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: TEXT_SEC,
  },
  modeChipTextOn: {
    color: ORANGE_DARK,
  },
  modeChipTextDisabled: {
    color: TEXT_MUTED,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hint: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: TEXT_SEC,
    lineHeight: 18,
  },
  hintError: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 18,
  },
  dateRow: {
    gap: 8,
    paddingBottom: 12,
  },
  dateChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  dateChipOn: {
    borderColor: ORANGE,
    backgroundColor: BG_SOFT,
  },
  dateChipText: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: TEXT_SEC,
  },
  dateChipTextOn: {
    color: ORANGE_DARK,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: '47%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  slotChipOn: {
    borderColor: ORANGE,
    backgroundColor: BG_SOFT,
  },
  slotChipText: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: TEXT,
  },
  slotChipTextOn: {
    color: ORANGE_DARK,
  },
  selectedBox: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: BG_SOFT,
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  selectedLabel: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: TEXT_SEC,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  selectedValue: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: ORANGE_DARK,
  },
});
