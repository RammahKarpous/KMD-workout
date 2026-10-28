import { addIsoDays, mondayOfWeek } from "./food";

export const NUTRIENT_KEYS = [
  "kcal",
  "fat",
  "saturatedFat",
  "carbs",
  "sugar",
  "protein",
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

/** Per-100g product values and the snapshotted totals on a diary entry. */
export type Nutrients = Record<NutrientKey, number>;

/**
 * Monday through Friday. The Laravel dietist page walks
 * `for ($i = 0; $i < 5; $i++)` from Monday, so Saturday and Sunday
 * never count toward the weekly red-meat total.
 */
export const RED_MEAT_COUNTED_DAYS = 5;

export function zeroNutrients(): Nutrients {
  return {
    kcal: 0,
    fat: 0,
    saturatedFat: 0,
    carbs: 0,
    sugar: 0,
    protein: 0,
  };
}

/** Half-up to 2 decimals, matching Laravel's `round(..., 2)` on the diary. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function assertNutrients(value: Nutrients): Nutrients {
  const checked = zeroNutrients();
  for (const key of NUTRIENT_KEYS) {
    const amount = value[key];
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Nutrient ${key} must be a number ≥ 0.`);
    }
    checked[key] = amount;
  }
  return checked;
}

/**
 * Diary math from the Laravel save path:
 * `round(per100g * amount / 100, 2)`. `amount` is grams, or ml for drinks
 * (per 100ml is the same formula).
 */
export function totalsForAmount(per100g: Nutrients, amount: number): Nutrients {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }
  const source = assertNutrients(per100g);
  const totals = zeroNutrients();
  for (const key of NUTRIENT_KEYS) {
    const scaled = round2((source[key] * amount) / 100);
    if (!Number.isFinite(scaled)) {
      throw new Error("Amount is too large to calculate.");
    }
    totals[key] = scaled;
  }
  return totals;
}

/**
 * Scale a snapshotted total when the product row is gone and the only
 * thing that changed is the amount. Prefer `totalsForAmount` when the
 * product's per-100g values are still available.
 */
export function rescaleTotals(
  totals: Nutrients,
  fromAmount: number,
  toAmount: number,
): Nutrients {
  if (!Number.isFinite(fromAmount) || fromAmount <= 0) {
    throw new Error("Can't rescale an entry with no amount.");
  }
  if (!Number.isFinite(toAmount) || toAmount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }
  const source = assertNutrients(totals);
  const scaled = zeroNutrients();
  for (const key of NUTRIENT_KEYS) {
    scaled[key] = round2((source[key] * toAmount) / fromAmount);
  }
  return scaled;
}

/**
 * Sum snapshotted totals. The diary and overview pages pass one day's
 * entries (already limited to that date by the query). The result is
 * rounded so `0.1 + 0.2` doesn't leak a float tail into the UI.
 */
export function sumNutrients(entries: ReadonlyArray<{ totals: Nutrients }>): Nutrients {
  const sum = zeroNutrients();
  for (const entry of entries) {
    const totals = assertNutrients(entry.totals);
    for (const key of NUTRIENT_KEYS) {
      sum[key] += totals[key];
    }
  }
  for (const key of NUTRIENT_KEYS) {
    sum[key] = round2(sum[key]);
  }
  return sum;
}

export type RedMeatEntry = {
  date: string;
  isRedMeat: boolean;
  grams?: number;
};

/**
 * Grams of red meat from Monday through Friday of the week containing
 * `referenceDate`. Weekend rows are ignored even when they fall inside
 * the same calendar week.
 */
export function weeklyRedMeatGrams(
  entries: ReadonlyArray<RedMeatEntry>,
  referenceDate: string,
): number {
  const monday = mondayOfWeek(referenceDate);
  const friday = addIsoDays(monday, RED_MEAT_COUNTED_DAYS - 1);
  let total = 0;
  for (const entry of entries) {
    if (!entry.isRedMeat) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;
    if (entry.date < monday || entry.date > friday) continue;
    const grams = entry.grams ?? 0;
    if (!Number.isFinite(grams) || grams <= 0) continue;
    total += grams;
  }
  return round2(total);
}
