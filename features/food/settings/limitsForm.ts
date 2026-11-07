import { z } from "zod";
import { DEFAULT_NUTRITION_LIMITS } from "@/shared/lib/goals";
import { NUTRIENT_KEYS, type NutrientKey, type Nutrients } from "@/shared/lib/nutrients";
import { parseNutrient } from "@/features/food/products/productForm";

export type LimitsFormInput = Record<NutrientKey, string>;

export type LimitsFieldErrors = Partial<Record<NutrientKey, string>>;

const limitField = z
  .string()
  .trim()
  .refine((value) => parseNutrient(value) !== undefined, "invalid")
  .transform((value) => parseNutrient(value) ?? 0);

export const limitsFormSchema = z.object({
  kcal: limitField,
  fat: limitField,
  saturatedFat: limitField,
  carbs: limitField,
  sugar: limitField,
  protein: limitField,
});

export function formFromLimits(limits: Nutrients): LimitsFormInput {
  return {
    kcal: String(limits.kcal),
    fat: String(limits.fat),
    saturatedFat: String(limits.saturatedFat),
    carbs: String(limits.carbs),
    sugar: String(limits.sugar),
    protein: String(limits.protein),
  };
}

export function validateLimitsForm(
  input: LimitsFormInput,
): { ok: true; value: Nutrients } | { ok: false; errors: LimitsFieldErrors } {
  const parsed = limitsFormSchema.safeParse(input);
  if (!parsed.success) {
    const errors: LimitsFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && isNutrientKey(key) && !errors[key]) {
        errors[key] = issue.message;
      }
    }
    return { ok: false, errors };
  }
  return { ok: true, value: parsed.data };
}

export function defaultLimitValues(): Record<NutrientKey, string> {
  const defaults = DEFAULT_NUTRITION_LIMITS;
  return {
    kcal: String(defaults.kcal),
    fat: String(defaults.fat),
    saturatedFat: String(defaults.saturatedFat),
    carbs: String(defaults.carbs),
    sugar: String(defaults.sugar),
    protein: String(defaults.protein),
  };
}

export const LIMIT_FIELD_KEYS: NutrientKey[] = [
  "kcal",
  "fat",
  "saturatedFat",
  "carbs",
  "sugar",
  "protein",
];

function isNutrientKey(key: string): key is NutrientKey {
  return (NUTRIENT_KEYS as readonly string[]).includes(key);
}
