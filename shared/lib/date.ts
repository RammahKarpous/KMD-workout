/** Monday 00:00 of the week containing `d`. */
export function startOfWeek(d: Date = new Date()): Date {
  const day = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - day);
  return out;
}

/** The 1st of the month containing `d`, at local midnight. */
export function startOfMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** `d`'s month shifted by `n` (negative goes back) — `Date`'s own
 * month-rollover handles year boundaries. */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** How many days are in the month containing `d`. */
export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Calendar-day key, stable across timezones for same-day comparisons. */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** "2026-07-13" for an `<input type="date">` value, in local time. */
export function toDateInputValue(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses an `<input type="date">` value ("YYYY-MM-DD") into a local-midnight timestamp. */
export function parseDateInputValue(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** "12:34" or "1:02:34" for durations at or past an hour. */
export function formatDuration(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export type RelativeDateLabels = { today: string; yesterday: string };

/** "Today", "Yesterday", or a short weekday date in `locale`. */
export function formatDate(
  ts: number,
  locale = "en",
  labels: RelativeDateLabels = { today: "Today", yesterday: "Yesterday" },
): string {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  if (todayKey(d) === todayKey(now)) return labels.today;
  if (todayKey(d) === todayKey(yesterday)) return labels.yesterday;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/** Compact date for chart axis ticks. */
export function formatShortDate(ts: number, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(ts));
}

/** Weekday, date, and time, in `locale`. */
export function formatFullDate(ts: number, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

/** Monday–Sunday range for the Statistics week nav. */
export function formatWeekRange(weekStartTs: number, locale = "en"): string {
  const start = new Date(weekStartTs);
  const end = new Date(weekStartTs + 6 * 86400000);
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/** Month title for the workout home calendar. */
export function formatMonthTitle(monthStartTs: number, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(monthStartTs),
  );
}
