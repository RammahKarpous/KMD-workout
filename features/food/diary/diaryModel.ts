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

function utcDate(iso: string): Date {
  const { year, month, day } = parseIsoDate(iso);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Weekday comes from the calendar date, not from a timezone-shifted instant. */
export function formatDiaryDate(iso: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate(iso));
}

export function formatShortDiaryDate(iso: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(utcDate(iso));
}

export function formatRangeDay(iso: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(utcDate(iso));
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
  overBy: number;
  remaining: number;
};

/** Equal to the limit is not over, matching the Laravel diary (`>`). */
export function limitReadout(value: number, limit: number): LimitReadout {
  const over = limit <= 0 ? value > 0 : value > limit;
  const atLimit = !over && value === limit;
  const overBy = over ? Math.round((value - Math.max(limit, 0)) * 100) / 100 : 0;
  const remaining = over || atLimit ? 0 : Math.round(Math.max(0, limit - value) * 100) / 100;
  const fillPercent = limit > 0 ? Math.min(100, (value / limit) * 100) : value > 0 ? 100 : 0;
  return { over, atLimit, fillPercent, overBy, remaining };
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
    return `${formatDiaryNumber(entry.ml ?? 0)} ml`;
  }
  return `${formatDiaryNumber(entry.grams ?? 0)} g`;
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
      ctx.addIssue({ code: "custom", path: ["moment"], message: "momentRequired" });
    }
    if (!isCategory(value.category)) {
      ctx.addIssue({ code: "custom", path: ["category"], message: "categoryRequired" });
    }
    if (parsePortion(value.amount) === undefined) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "amountInvalid" });
    }
    if (!value.productId) {
      ctx.addIssue({ code: "custom", path: ["productId"], message: "productRequired" });
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
