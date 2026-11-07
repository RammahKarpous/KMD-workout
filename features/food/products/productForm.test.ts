import { describe, expect, it } from "vitest";
import {
  formFromLookup,
  parseNutrient,
  productQuery,
  productSummary,
  validateProductForm,
  type ProductFormInput,
} from "./productForm";

const valid: ProductFormInput = {
  name: "  Oats  ",
  barcode: "",
  kcal: "370",
  fat: "7,1",
  saturatedFat: "1.2",
  carbs: "60",
  sugar: "0",
  protein: "13",
};

describe("validateProductForm", () => {
  it("accepts comma decimals and trims the name", () => {
    const result = validateProductForm(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe("Oats");
    expect(result.value.barcode).toBeUndefined();
    expect(result.value.per100g.fat).toBe(7.1);
    expect(result.value.per100g.saturatedFat).toBe(1.2);
  });

  it("keeps a barcode of digits, spaces, or dashes", () => {
    const result = validateProductForm({ ...valid, barcode: "3017 6204-22003" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.barcode).toBe("3017620422003");
  });

  it("rejects an empty name, a negative nutrient, and letters in a barcode", () => {
    const result = validateProductForm({
      ...valid,
      name: "   ",
      kcal: "-1",
      barcode: "abc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.kcal).toBeTruthy();
    expect(result.errors.barcode).toBeTruthy();
  });
});

describe("parseNutrient", () => {
  it("reads a leading decimal", () => {
    expect(parseNutrient(".5")).toBe(0.5);
    expect(parseNutrient("")).toBeUndefined();
  });
});

describe("productQuery", () => {
  it("falls back to the list when the search box is empty", () => {
    expect(productQuery("")).toEqual({ mode: "list" });
    expect(productQuery("   ")).toEqual({ mode: "list" });
  });

  it("uses the search index for a real query", () => {
    expect(productQuery("  oats ")).toEqual({ mode: "search", query: "oats" });
  });
});

describe("formFromLookup", () => {
  it("prefills the form from an Open Food Facts hit", () => {
    expect(
      formFromLookup(
        {
          name: "Havermout",
          per100g: { kcal: 370, fat: 7, saturatedFat: 1.2, carbs: 60, sugar: 1, protein: 13 },
        },
        "123",
      ),
    ).toMatchObject({
      name: "Havermout",
      barcode: "123",
      kcal: "370.00",
      saturatedFat: "1.20",
    });
  });
});

describe("productSummary", () => {
  it("picks a message key for an empty catalog, a search miss, and a longer page", () => {
    expect(productSummary({ query: "", count: 0, status: "ready", canLoadMore: false })).toEqual({
      key: "summaryEmpty",
      values: {},
    });
    expect(productSummary({ query: "oats", count: 0, status: "ready", canLoadMore: false })).toEqual({
      key: "summaryEmptySearch",
      values: { query: "oats" },
    });
    expect(productSummary({ query: "", count: 20, status: "ready", canLoadMore: true })).toEqual({
      key: "summaryCountMore",
      values: { count: 20 },
    });
    expect(productSummary({ query: "", count: 0, status: "loading", canLoadMore: false })).toEqual({
      key: "summaryLoading",
      values: {},
    });
  });
});
