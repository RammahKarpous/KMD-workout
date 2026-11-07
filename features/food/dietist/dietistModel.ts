import { DRINK_CATEGORY, FOOD_CATEGORIES, addIsoDays, type FoodCategory } from "@/shared/lib/food";
import { CATEGORY_GOALS } from "@/shared/lib/goals";
import { formatDiaryNumber } from "@/features/food/diary/diaryModel";

export type CategoryEntry = {
  date: string;
  category?: FoodCategory;
  productName: string;
  grams?: number;
  ml?: number;
};

/** Drinks (`vocht`) are millilitres. Every other category is grams. */
export function entryCategoryAmount(entry: {
  category?: string;
  grams?: number;
  ml?: number;
}): number {
  if (entry.category === DRINK_CATEGORY) return entry.ml ?? 0;
  return entry.grams ?? 0;
}

export function categoryAmounts(
  entries: readonly { category?: FoodCategory; grams?: number; ml?: number }[],
): Record<FoodCategory, number> {
  const totals = Object.fromEntries(FOOD_CATEGORIES.map((category) => [category, 0])) as Record<
    FoodCategory,
    number
  >;
  for (const entry of entries) {
    if (!entry.category) continue;
    totals[entry.category] += entryCategoryAmount(entry);
  }
  for (const category of FOOD_CATEGORIES) {
    totals[category] = Math.round(totals[category] * 100) / 100;
  }
  return totals;
}

export function foodsByCategory(entries: readonly CategoryEntry[]): {
  category: FoodCategory;
  items: { name: string; amount: number; unit: "g" | "ml" }[];
}[] {
  return FOOD_CATEGORIES.flatMap((category) => {
    const items = entries
      .filter((entry) => entry.category === category)
      .map((entry) => ({
        name: entry.productName,
        amount: entryCategoryAmount(entry),
        unit: CATEGORY_GOALS[category].unit,
      }));
    if (items.length === 0) return [];
    return [{ category, items }];
  });
}

/** Monday–Friday rows for the week view. */
export function weekdayCategoryRows(
  entries: readonly CategoryEntry[],
  monday: string,
): { date: string; amounts: Record<FoodCategory, number> }[] {
  return [0, 1, 2, 3, 4].map((offset) => {
    const date = addIsoDays(monday, offset);
    return {
      date,
      amounts: categoryAmounts(entries.filter((entry) => entry.date === date)),
    };
  });
}

/** Ring length for an SVG donut whose circumference is treated as 100. Caps at a full ring. */
export function donutDash(fillPercent: number): string {
  const filled = Math.max(0, Math.min(100, fillPercent));
  return `${filled} ${100 - filled}`;
}

export function formatGoalAmount(amount: number, unit: "g" | "ml"): string {
  return `${formatDiaryNumber(amount)} ${unit}`;
}
