import { z } from "zod";
import {
  DRINK_CATEGORY,
  FOOD_CATEGORIES,
  FOOD_MOMENTS,
  addIsoDays,
  canonicalIsoDate,
  mondayOfWeek,
  parseIsoDate,
  type FoodCategory,
  type FoodMoment,
} from "@/shared/lib/food";
import { toDateInputValue } from "@/shared/lib/date";
import { RED_MEAT_COUNTED_DAYS, sumNutrients, weeklyRedMeatGrams, type Nutrients, type RedMeatEntry } from "@/shared/lib/nutrients";
import { RED_MEAT_WEEKLY_GRAMS } from "@/shared/lib/goals";
import { parseNutrient } from "@/features/food/products/productForm";
import { DIARY_COPY } from "./copy";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Today's calendar date in the user's local timezone, for the date picker. */
export function localTodayIso(now: Date = new Date()): string {
  return toDateInputValue(now);
}

export function isDiaryDate(value: string): boolean {
  try {
    canonicalIsoDate(value);
    return true;
  } catch {
    return false;
  }
}

export function adjacentDay(iso: string, direction: "previous" | "next"): string {
  return addIsoDays(iso, direction === "next" ? 1 : -1);
}

/** Weekday is taken from the calendar date, not from the local offset of midnight UTC. */
export function formatDiaryDate(iso: string): string {
  const { year, month, day } = parseIsoDate(iso);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ${day} ${MONTHS[month - 1]} ${year}`;
}

export function formatShortDiaryDate(iso: string): string {
  const { month, day } = parseIsoDate(iso);
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Wed 28 Oct", using the calendar date's weekday. */
export function formatRangeDay(iso: string): string {
  const { year, month, day } = parseIsoDate(iso);
  const weekday = WEEKDAYS_SHORT[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ${formatShortDiaryDate(iso)}`;
}

/** Monday through Friday of the week that contains `referenceDate`. */
export function redMeatWeekRange(referenceDate: string): { start: string; end: string } {
  const start = mondayOfWeek(referenceDate);
  return { start, end: addIsoDays(start, RED_MEAT_COUNTED_DAYS - 1) };
}

export function diaryRedMeatGrams(entries: readonly RedMeatEntry[], referenceDate: string): number {
  return weeklyRedMeatGrams(entries, referenceDate);
}

export const RED_MEAT_LIMIT = RED_MEAT_WEEKLY_GRAMS;

export function portionKind(category: string): "ml" | "grams" {
  return category === DRINK_CATEGORY ? "ml" : "grams";
}

export function formatDiaryNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function parsePortion(raw: string): number | undefined {
  const value = parseNutrient(raw);
  if (value === undefined || value <= 0) return undefined;
  return value;
}

export type LimitReadout = {
  over: boolean;
  atLimit: boolean;
  fillPercent: number;
  detail: string;
  valuetext: string;
};

/**
 * Equal to the limit is not over, matching the Laravel diary (`>`).
 * The words in `detail` carry the over-limit state; color is extra.
 */
export function limitReadout(label: string, value: number, limit: number, unit: string): LimitReadout {
  const over = limit <= 0 ? value > 0 : value > limit;
  const atLimit = !over && value === limit;
  const overBy = over ? Math.round((value - Math.max(limit, 0)) * 100) / 100 : 0;
  const remaining = over ? 0 : Math.round((limit - value) * 100) / 100;
  const detail = over
    ? DIARY_COPY.overBy(formatDiaryNumber(overBy), unit)
    : atLimit
      ? DIARY_COPY.atLimit
      : DIARY_COPY.remaining(formatDiaryNumber(remaining), unit);
  const fillPercent = limit > 0 ? Math.min(100, (value / limit) * 100) : value > 0 ? 100 : 0;
  return {
    over,
    atLimit,
    fillPercent,
    detail,
    valuetext: DIARY_COPY.meterText(label, formatDiaryNumber(value), formatDiaryNumber(Math.max(limit, 0)), unit, detail),
  };
}

export type MomentGroup<T extends { moment: FoodMoment; totals: Nutrients }> = {
  moment: FoodMoment;
  entries: T[];
  subtotal: Nutrients;
};

/** Groups in ontbijt → na_training order. Empty moments are left out. */
export function groupEntriesByMoment<T extends { moment: FoodMoment; totals: Nutrients }>(
  entries: readonly T[],
): MomentGroup<T>[] {
  return FOOD_MOMENTS.flatMap((moment) => {
    const rows = entries.filter((entry) => entry.moment === moment);
    if (rows.length === 0) return [];
    return [{ moment, entries: rows, subtotal: sumNutrients(rows) }];
  });
}

export function entryAmountText(entry: { category?: string; grams?: number; ml?: number }): string {
  if (portionKind(entry.category ?? "") === "ml") {
    return `${formatDiaryNumber(entry.ml ?? 0)} ${DIARY_COPY.unitMl}`;
  }
  return `${formatDiaryNumber(entry.grams ?? 0)} ${DIARY_COPY.unitGrams}`;
}

export type EntryFormInput = {
  moment: string;
  category: string;
  amount: string;
  isRedMeat: boolean;
  productId: string | null;
};

export type EntryFormErrors = Partial<Record<"moment" | "category" | "amount" | "productId", string>>;

export type EntryFormValue = {
  moment: FoodMoment;
  category: FoodCategory;
  amount: number;
  isRedMeat: boolean;
  productId: string;
};

const entryFormSchema = z
  .object({
    moment: z.string(),
    category: z.string(),
    amount: z.string(),
    isRedMeat: z.boolean(),
    productId: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!isMoment(value.moment)) {
      ctx.addIssue({ code: "custom", path: ["moment"], message: DIARY_COPY.momentRequired });
    }
    if (!isCategory(value.category)) {
      ctx.addIssue({ code: "custom", path: ["category"], message: DIARY_COPY.categoryRequired });
    }
    if (parsePortion(value.amount) === undefined) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: DIARY_COPY.amountInvalid });
    }
    if (!value.productId) {
      ctx.addIssue({ code: "custom", path: ["productId"], message: DIARY_COPY.productRequired });
    }
  });

export function validateEntryForm(
  input: EntryFormInput,
): { ok: true; value: EntryFormValue } | { ok: false; errors: EntryFormErrors } {
  const parsed = entryFormSchema.safeParse(input);
  if (!parsed.success) {
    const errors: EntryFormErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "moment" || key === "category" || key === "amount" || key === "productId") {
        if (!errors[key]) errors[key] = issue.message;
      }
    }
    return { ok: false, errors };
  }
  const moment = input.moment as FoodMoment;
  const category = input.category as FoodCategory;
  return {
    ok: true,
    value: {
      moment,
      category,
      amount: parsePortion(input.amount) ?? 0,
      isRedMeat: category === "vlees" && input.isRedMeat,
      productId: input.productId ?? "",
    },
  };
}

function isMoment(value: string): value is FoodMoment {
  return (FOOD_MOMENTS as readonly string[]).includes(value);
}

function isCategory(value: string): value is FoodCategory {
  return (FOOD_CATEGORIES as readonly string[]).includes(value);
}
