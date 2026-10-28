import { z } from "zod";
import { barcodeDigits } from "@/shared/lib/food";
import type { Nutrients } from "@/shared/lib/nutrients";
import { PRODUCTS_COPY } from "./copy";

export const NUTRIENT_FIELD_KEYS = [
  "kcal",
  "fat",
  "saturatedFat",
  "carbs",
  "sugar",
  "protein",
] as const;

export type NutrientFieldKey = (typeof NUTRIENT_FIELD_KEYS)[number];

export type ProductFormInput = {
  name: string;
  barcode: string;
  kcal: string;
  fat: string;
  saturatedFat: string;
  carbs: string;
  sugar: string;
  protein: string;
};

export type ProductFieldErrors = Partial<Record<keyof ProductFormInput, string>>;

export type ProductFormValue = {
  name: string;
  barcode?: string;
  per100g: Nutrients;
};

const NUTRIENT_LABEL: Record<NutrientFieldKey, string> = {
  kcal: PRODUCTS_COPY.calories,
  fat: PRODUCTS_COPY.fat,
  saturatedFat: PRODUCTS_COPY.saturatedFat,
  carbs: PRODUCTS_COPY.carbs,
  sugar: PRODUCTS_COPY.sugar,
  protein: PRODUCTS_COPY.protein,
};

/** "1,5" and "1.5" are both accepted, matching the Laravel number inputs. */
export function parseNutrient(raw: string): number | undefined {
  const trimmed = raw.trim().replace(",", ".");
  if (!/^\d*\.?\d+$|^\d+\.$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}

export function parseBarcode(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const digits = barcodeDigits(trimmed);
  if (digits.length === 0 || digits.length > 32) return undefined;
  if (digits !== trimmed.replace(/[\s-]/g, "")) return undefined;
  return digits;
}

function nutrientField() {
  return z
    .string()
    .trim()
    .refine((value) => parseNutrient(value) !== undefined, PRODUCTS_COPY.nutrientInvalid)
    .transform((value) => parseNutrient(value) ?? 0);
}

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, PRODUCTS_COPY.nameRequired)
    .max(200, PRODUCTS_COPY.nameTooLong),
  barcode: z
    .string()
    .refine((value) => value.trim() === "" || parseBarcode(value) !== undefined, PRODUCTS_COPY.barcodeInvalid)
    .transform((value) => parseBarcode(value)),
  kcal: nutrientField(),
  fat: nutrientField(),
  saturatedFat: nutrientField(),
  carbs: nutrientField(),
  sugar: nutrientField(),
  protein: nutrientField(),
});

export function validateProductForm(
  input: ProductFormInput,
): { ok: true; value: ProductFormValue } | { ok: false; errors: ProductFieldErrors } {
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    const errors: ProductFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key !== "string" || key in errors) continue;
      if (isFieldKey(key)) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      name: parsed.data.name,
      ...(parsed.data.barcode ? { barcode: parsed.data.barcode } : {}),
      per100g: {
        kcal: parsed.data.kcal,
        fat: parsed.data.fat,
        saturatedFat: parsed.data.saturatedFat,
        carbs: parsed.data.carbs,
        sugar: parsed.data.sugar,
        protein: parsed.data.protein,
      },
    },
  };
}

export function emptyProductForm(): ProductFormInput {
  return {
    name: "",
    barcode: "",
    kcal: "",
    fat: "",
    saturatedFat: "",
    carbs: "",
    sugar: "",
    protein: "",
  };
}

export function formFromProduct(product: {
  name: string;
  barcode?: string;
  per100g: Nutrients;
}): ProductFormInput {
  return {
    name: product.name,
    barcode: product.barcode ?? "",
    kcal: formatNutrientInput(product.per100g.kcal),
    fat: formatNutrientInput(product.per100g.fat),
    saturatedFat: formatNutrientInput(product.per100g.saturatedFat),
    carbs: formatNutrientInput(product.per100g.carbs),
    sugar: formatNutrientInput(product.per100g.sugar),
    protein: formatNutrientInput(product.per100g.protein),
  };
}

export function formFromLookup(
  found: { name: string; per100g: Nutrients },
  barcode: string,
): ProductFormInput {
  return formFromProduct({
    name: found.name,
    barcode,
    per100g: found.per100g,
  });
}

export function formatNutrientInput(value: number): string {
  return value.toFixed(2);
}

/** List display: 370 stays "370", 1.20 stays "1.2". */
export function formatPer100g(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

/**
 * A blank search uses the alphabetical `list` query. A non-empty one uses
 * the search index. The two paginated queries can't share a cursor, so the
 * screen runs only one of them.
 */
export function productQuery(raw: string): { mode: "list" } | { mode: "search"; query: string } {
  const query = raw.trim();
  if (!query) return { mode: "list" };
  return { mode: "search", query };
}

export function nutrientLabel(key: NutrientFieldKey): string {
  return NUTRIENT_LABEL[key];
}

function isFieldKey(key: string): key is keyof ProductFormInput {
  return (
    key === "name" ||
    key === "barcode" ||
    key === "kcal" ||
    key === "fat" ||
    key === "saturatedFat" ||
    key === "carbs" ||
    key === "sugar" ||
    key === "protein"
  );
}
