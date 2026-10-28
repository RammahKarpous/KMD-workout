import { z } from "zod";
import { barcodeDigits } from "@/shared/lib/food";
import type { Nutrients } from "@/shared/lib/nutrients";

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
    .refine((value) => parseNutrient(value) !== undefined, "nutrientInvalid")
    .transform((value) => parseNutrient(value) ?? 0);
}

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "nameRequired")
    .max(200, "nameTooLong"),
  barcode: z
    .string()
    .refine((value) => value.trim() === "" || parseBarcode(value) !== undefined, "barcodeInvalid")
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

export function productSummary(input: {
  query: string;
  count: number;
  status: "loading" | "loading-more" | "ready";
  canLoadMore: boolean;
}): { key: string; values: Record<string, string | number> } {
  if (input.status === "loading") return { key: "summaryLoading", values: {} };
  if (input.status === "loading-more") return { key: "summaryLoadingMore", values: {} };
  const query = input.query;
  if (query) {
    if (input.count === 0) return { key: "summaryEmptySearch", values: { query } };
    if (input.count === 1) {
      return { key: input.canLoadMore ? "summaryMatchOneMore" : "summaryMatchOne", values: { query } };
    }
    return {
      key: input.canLoadMore ? "summaryMatchMore" : "summaryMatch",
      values: { count: input.count, query },
    };
  }
  if (input.count === 0) return { key: "summaryEmpty", values: {} };
  if (input.count === 1) return { key: "summaryOne", values: {} };
  return {
    key: input.canLoadMore ? "summaryCountMore" : "summaryCount",
    values: { count: input.count },
  };
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
