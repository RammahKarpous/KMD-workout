import type { FoodCategory } from "./food";
import type { Nutrients } from "./nutrients";

/**
 * Used when a user has no `nutritionLimits` row. These are the column
 * defaults from the Laravel `nutritional_limits` migration
 * (`kcal_limiet`, `vet_limiet`, `verzadigd_limiet`, `koolhydraten_limiet`,
 * `suiker_limiet`, `eiwit_limiet`).
 */
export const DEFAULT_NUTRITION_LIMITS: Nutrients = {
  kcal: 2000,
  fat: 50,
  saturatedFat: 15,
  carbs: 220,
  sugar: 30,
  protein: 130,
};

/**
 * Dietist page category caps (`Dietist::GOALS`). `vocht` is millilitres;
 * every other category is grams. Red meat has its own weekly cap and is
 * not a daily category goal.
 */
export const CATEGORY_GOALS: Record<FoodCategory, { max: number; unit: "g" | "ml" }> = {
  groente: { max: 250, unit: "g" },
  fruit: { max: 300, unit: "g" },
  koolhydraten: { max: 495, unit: "g" },
  vlees: { max: 100, unit: "g" },
  noten: { max: 25, unit: "g" },
  zuivel: { max: 450, unit: "g" },
  kaas: { max: 40, unit: "g" },
  bereidingsvet: { max: 15, unit: "g" },
  margarine: { max: 15, unit: "g" },
  onbekend: { max: 100, unit: "g" },
  vocht: { max: 2000, unit: "ml" },
};

/** `Dietist::RED_MEAT_WEEKLY_LIMIT`. Counts Monday–Friday only. */
export const RED_MEAT_WEEKLY_GRAMS = 300;
