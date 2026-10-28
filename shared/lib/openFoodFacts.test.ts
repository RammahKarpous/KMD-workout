import { describe, expect, it } from "vitest";
import { parseOpenFoodFactsProduct } from "./openFoodFacts";

describe("parseOpenFoodFactsProduct", () => {
  it("returns null when the barcode is unknown", () => {
    expect(parseOpenFoodFactsProduct({ status: 0, product: {} })).toBeNull();
    expect(parseOpenFoodFactsProduct(null)).toBeNull();
  });

  it("maps the per-100g nutriments", () => {
    expect(
      parseOpenFoodFactsProduct({
        status: 1,
        product: {
          product_name: "  Havermout  ",
          nutriments: {
            "energy-kcal_100g": 370,
            fat_100g: 7,
            "saturated-fat_100g": 1.2,
            carbohydrates_100g: 60,
            sugars_100g: "1.1",
            proteins_100g: 13,
          },
        },
      }),
    ).toEqual({
      name: "Havermout",
      per100g: {
        kcal: 370,
        fat: 7,
        saturatedFat: 1.2,
        carbs: 60,
        sugar: 1.1,
        protein: 13,
      },
    });
  });

  it("falls back to kilojoules and then to zero", () => {
    expect(
      parseOpenFoodFactsProduct({
        status: 1,
        product: {
          product_name_en: "Oats",
          nutriments: { energy_100g: 418.4 },
        },
      }),
    ).toEqual({
      name: "Oats",
      per100g: {
        kcal: 100,
        fat: 0,
        saturatedFat: 0,
        carbs: 0,
        sugar: 0,
        protein: 0,
      },
    });
  });
});
