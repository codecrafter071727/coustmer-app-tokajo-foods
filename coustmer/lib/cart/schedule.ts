/** Cart schedule helpers (Asia/Kolkata). */

export type ScheduleSlot = {
  start: string;
  end: string;
  available: boolean;
  startIso: string;
};

export type ScheduleDay = {
  date: string;
  slots: ScheduleSlot[];
};

export type ScheduleSlotsResponse = {
  timezone: string;
  scheduleSupported: boolean;
  /** Single-day shape */
  date?: string;
  slots?: ScheduleSlot[];
  /** Multi-day shape */
  days?: ScheduleDay[];
};

export function istTodayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatScheduleDayLabel(ymd: string): string {
  const [y, mo, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y!, mo! - 1, d!, 12, 0, 0));
  const today = istTodayYmd();
  const tomorrow = addIstDays(today, 1);
  if (ymd === today) return 'Today';
  if (ymd === tomorrow) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatScheduleSlotLabel(start: string, end: string): string {
  return `${formatIstTime12h(start)} – ${formatIstTime12h(end)}`;
}

export function formatScheduledForDisplay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const when = new Date(iso);
  if (!Number.isFinite(when.getTime())) return null;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(when);
}

function formatIstTime12h(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function addIstDays(ymd: string, days: number): string {
  const [y, mo, d] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(y!, mo! - 1, d! + days, 12, 0, 0));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utc);
}

export function normalizeScheduleSlotsResponse(raw: unknown): ScheduleSlotsResponse {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const timezone = String(record.timezone ?? 'Asia/Kolkata');
  const scheduleSupported = record.scheduleSupported !== false;

  const mapSlot = (s: unknown): ScheduleSlot => {
    const row = s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
    const start = String(row.start ?? row.startTime ?? '');
    const end = String(row.end ?? row.endTime ?? '');
    const startIso = String(row.startIso ?? row.scheduledFor ?? '');
    return {
      start,
      end,
      startIso,
      available: row.available !== false,
    };
  };

  if (Array.isArray(record.days)) {
    return {
      timezone,
      scheduleSupported,
      days: record.days.map((day) => {
        const d = day as Record<string, unknown>;
        return {
          date: String(d.date ?? ''),
          slots: Array.isArray(d.slots) ? d.slots.map(mapSlot) : [],
        };
      }),
    };
  }

  const date = String(record.date ?? istTodayYmd());
  const slots = Array.isArray(record.slots) ? record.slots.map(mapSlot) : [];
  return { timezone, scheduleSupported, date, slots };
}

export function pickAvailableSlots(days: ScheduleDay[]): ScheduleDay[] {
  return days
    .map((day) => ({
      ...day,
      slots: day.slots.filter((s) => s.available && s.startIso),
    }))
    .filter((day) => day.slots.length > 0);
}
