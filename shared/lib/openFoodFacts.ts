import { NUTRIENT_KEYS, round2, zeroNutrients, type Nutrients } from "./nutrients";

export type OpenFoodFactsProduct = {
  name: string;
  per100g: Nutrients;
};

/**
 * Maps an Open Food Facts v2 product response to the fields we store.
 * Returns null when the barcode isn't in their database (`status !== 1`).
 * Missing nutrients become 0, same as the Laravel form filler. kJ is only
 * used when kcal isn't present (`energy_100g / 4.184`).
 */
export function parseOpenFoodFactsProduct(payload: unknown): OpenFoodFactsProduct | null {
  if (!isRecord(payload) || payload.status !== 1) return null;
  const product = payload.product;
  if (!isRecord(product)) return null;

  const nutriments = isRecord(product.nutriments) ? product.nutriments : {};
  const per100g = zeroNutrients();
  const raw: Record<keyof Nutrients, number | undefined> = {
    kcal: kcalPer100g(nutriments),
    fat: readNumber(nutriments.fat_100g),
    saturatedFat: readNumber(nutriments["saturated-fat_100g"]),
    carbs: readNumber(nutriments.carbohydrates_100g),
    sugar: readNumber(nutriments.sugars_100g),
    protein: readNumber(nutriments.proteins_100g),
  };
  for (const key of NUTRIENT_KEYS) {
    const value = raw[key];
    per100g[key] = value === undefined ? 0 : round2(Math.max(0, value));
  }

  return {
    name: readName(product),
    per100g,
  };
}

function kcalPer100g(nutriments: Record<string, unknown>): number | undefined {
  const kcal = readNumber(nutriments["energy-kcal_100g"]);
  if (kcal !== undefined) return kcal;
  const kilojoules = readNumber(nutriments.energy_100g);
  if (kilojoules === undefined) return undefined;
  return kilojoules / 4.184;
}

function readName(product: Record<string, unknown>): string {
  return readString(product.product_name) || readString(product.product_name_en) || "Unknown product";
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
