/**
 * Food-tracker domain values shared by Convex functions and the UI.
 * Names are stable ids. The Laravel app stored Dutch display labels
 * ("Ontbijt", "Voor training"); a later i18n pass can translate these.
 */

export const FOOD_MOMENTS = [
  "ontbijt",
  "lunch",
  "tussendoor",
  "diner",
  "voor_training",
  "na_training",
] as const;

export type FoodMoment = (typeof FOOD_MOMENTS)[number];

export const FOOD_CATEGORIES = [
  "groente",
  "fruit",
  "koolhydraten",
  "vlees",
  "noten",
  "zuivel",
  "kaas",
  "bereidingsvet",
  "margarine",
  "onbekend",
  "vocht",
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

/** Drinks are logged in ml. Every other category is logged in grams. */
export const DRINK_CATEGORY = "vocht" satisfies FoodCategory;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type IsoDateParts = { year: number; month: number; day: number };

/**
 * Calendar dates are `YYYY-MM-DD` strings, not timestamps.
 * `new Date("2026-10-28")` is UTC midnight, and `getDay()` then shifts
 * the weekday in timezones behind UTC. Parsing the parts and using
 * `Date.UTC` keeps Monday–Friday stable for every user.
 */
export function parseIsoDate(value: string): IsoDateParts {
  const match = ISO_DATE.exec(value);
  if (!match) {
    throw new Error("Date must be YYYY-MM-DD.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new Error("Date must be a real calendar day.");
  }
  return { year, month, day };
}

export function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function canonicalIsoDate(value: string): string {
  const { year, month, day } = parseIsoDate(value);
  return formatIsoDate(year, month, day);
}

export function addIsoDays(isoDate: string, days: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return formatIsoDate(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

/** Monday of the week that contains `isoDate` (Sunday belongs to the previous Monday). */
export function mondayOfWeek(isoDate: string): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addIsoDays(formatIsoDate(year, month, day), -daysFromMonday);
}

export function inclusiveIsoDayCount(start: string, end: string): number {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  const startMs = Date.UTC(from.year, from.month - 1, from.day);
  const endMs = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((endMs - startMs) / 86_400_000) + 1;
}

const MAX_PRODUCT_NAME_LENGTH = 200;
const MAX_BARCODE_LENGTH = 32;

export function assertProductName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Product name is required.");
  }
  if (trimmed.length > MAX_PRODUCT_NAME_LENGTH) {
    throw new Error("Product name is too long.");
  }
  return trimmed;
}

export function barcodeDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function normalizeBarcode(raw: string): string {
  const digits = barcodeDigits(raw);
  if (digits.length === 0 || digits.length > MAX_BARCODE_LENGTH) {
    throw new Error("Invalid barcode.");
  }
  return digits;
}

/**
 * Red meat only counts when the entry is actually meat. The Laravel diary
 * stores `is_red_meat` as `category === 'vlees' && checkbox`, so a checked
 * box on another category (or a cleared category) must not survive.
 */
export function resolveIsRedMeat(
  category: FoodCategory | undefined,
  requested: boolean,
): boolean {
  return category === "vlees" && requested;
}

export type ResolvedAmount = { grams?: number; ml?: number; amount: number };

/**
 * `vocht` is stored as ml. Everything else is grams. Exactly one of the two
 * is set so a drink can't also carry a gram weight.
 */
export function resolveEntryAmount(
  category: FoodCategory | undefined,
  grams: number | undefined,
  ml: number | undefined,
): ResolvedAmount {
  if (category === DRINK_CATEGORY) {
    if (grams !== undefined) {
      throw new Error("Drinks (vocht) are logged in ml, not grams.");
    }
    if (ml === undefined) {
      throw new Error("Drinks (vocht) need an amount in ml.");
    }
    return { ml: assertPortion(ml), amount: assertPortion(ml) };
  }
  if (ml !== undefined) {
    throw new Error("Only drinks (vocht) are logged in ml.");
  }
  if (grams === undefined) {
    throw new Error("Enter an amount in grams.");
  }
  return { grams: assertPortion(grams), amount: assertPortion(grams) };
}

export function entryAmount(entry: {
  category?: FoodCategory;
  grams?: number;
  ml?: number;
}): number {
  if (entry.category === DRINK_CATEGORY) {
    if (entry.ml === undefined) {
      throw new Error("Drink entry is missing ml.");
    }
    return entry.ml;
  }
  if (entry.grams === undefined) {
    throw new Error("Entry is missing grams.");
  }
  return entry.grams;
}

function assertPortion(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }
  return amount;
}
