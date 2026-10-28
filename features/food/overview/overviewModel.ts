import {
  addIsoDays,
  formatIsoDate,
  inclusiveIsoDayCount,
  mondayOfWeek,
  parseIsoDate,
} from "@/shared/lib/food";
import { sumNutrients, type Nutrients } from "@/shared/lib/nutrients";
export type RangeKind = "week" | "month";

/**
 * Monday–Sunday. A calendar month is at most 31 days, which is the
 * `listByDateRange` cap, so either range is one indexed read.
 */
export function periodRange(anchor: string, kind: RangeKind): { start: string; end: string } {
  if (kind === "week") {
    const start = mondayOfWeek(anchor);
    return { start, end: addIsoDays(start, 6) };
  }
  const { year, month } = parseIsoDate(anchor);
  const start = formatIsoDate(year, month, 1);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start, end: formatIsoDate(year, month, lastDay) };
}

export function periodLength(anchor: string, kind: RangeKind): number {
  const range = periodRange(anchor, kind);
  return inclusiveIsoDayCount(range.start, range.end);
}

export function shiftAnchor(anchor: string, kind: RangeKind, direction: "previous" | "next"): string {
  const delta = direction === "next" ? 1 : -1;
  if (kind === "week") return addIsoDays(anchor, delta * 7);
  return shiftMonth(anchor, delta);
}

export function shiftMonth(iso: string, delta: number): string {
  const { year, month, day } = parseIsoDate(iso);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  const nextYear = shifted.getUTCFullYear();
  const nextMonth = shifted.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  return formatIsoDate(nextYear, nextMonth, Math.min(day, lastDay));
}

export function formatMonthTitle(iso: string, locale = "en"): string {
  const { year, month } = parseIsoDate(iso);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatPeriodLabel(anchor: string, kind: RangeKind, locale = "en"): string {
  const range = periodRange(anchor, kind);
  if (kind === "month") return formatMonthTitle(anchor, locale);
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const start = fmt.format(new Date(Date.UTC(...isoParts(range.start))));
  const end = fmt.format(new Date(Date.UTC(...isoParts(range.end))));
  return `${start} – ${end}`;
}

function isoParts(iso: string): [number, number, number] {
  const { year, month, day } = parseIsoDate(iso);
  return [year, month - 1, day];
}

/** One row per calendar day in the range, including days with no entries. */
export function dailyTotals(
  entries: readonly { date: string; totals: Nutrients }[],
  start: string,
  end: string,
): { date: string; totals: Nutrients }[] {
  const rows: { date: string; totals: Nutrients }[] = [];
  let cursor = start;
  while (cursor <= end && rows.length <= 31) {
    rows.push({
      date: cursor,
      totals: sumNutrients(entries.filter((entry) => entry.date === cursor)),
    });
    if (cursor === end) break;
    cursor = addIsoDays(cursor, 1);
  }
  return rows;
}
