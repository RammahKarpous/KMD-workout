import { describe, expect, it } from "vitest";
import { CATEGORY_GOALS, DEFAULT_NUTRITION_LIMITS, RED_MEAT_WEEKLY_GRAMS } from "./goals";
import {
  rescaleTotals,
  sumNutrients,
  totalsForAmount,
  weeklyRedMeatGrams,
  zeroNutrients,
  type Nutrients,
} from "./nutrients";

const per100g: Nutrients = {
  kcal: 200,
  fat: 10,
  saturatedFat: 1,
  carbs: 20,
  sugar: 5,
  protein: 8,
};

describe("totalsForAmount", () => {
  it("scales per-100g nutrients by the amount", () => {
    expect(totalsForAmount(per100g, 250)).toEqual({
      kcal: 500,
      fat: 25,
      saturatedFat: 2.5,
      carbs: 50,
      sugar: 12.5,
      protein: 20,
    });
  });

  it("rounds each nutrient to 2 decimals", () => {
    expect(totalsForAmount({ ...per100g, kcal: 33.33 }, 50).kcal).toBe(16.67);
  });

  it("rejects a non-positive amount", () => {
    expect(() => totalsForAmount(per100g, 0)).toThrow(/greater than 0/);
  });
});

describe("sumNutrients", () => {
  it("adds a day's snapshotted totals", () => {
    const breakfast = totalsForAmount(per100g, 100);
    const lunch = totalsForAmount(per100g, 50);
    expect(sumNutrients([{ totals: breakfast }, { totals: lunch }])).toEqual(
      totalsForAmount(per100g, 150),
    );
  });

  it("rounds the sum so binary float tails don't leak", () => {
    const totals = zeroNutrients();
    expect(
      sumNutrients([
        { totals: { ...totals, kcal: 0.1 } },
        { totals: { ...totals, kcal: 0.2 } },
      ]).kcal,
    ).toBe(0.3);
  });

  it("returns zeros for an empty day", () => {
    expect(sumNutrients([])).toEqual(zeroNutrients());
  });
});

describe("rescaleTotals", () => {
  it("scales a snapshot when the product row is gone", () => {
    const snapshot = totalsForAmount(per100g, 100);
    expect(rescaleTotals(snapshot, 100, 40)).toEqual(totalsForAmount(per100g, 40));
  });
});

describe("weeklyRedMeatGrams", () => {
  // Week of 2026-10-26 (Monday) through 2026-10-30 (Friday).
  const week = "2026-10-28";

  it("counts Monday through Friday only", () => {
    const grams = weeklyRedMeatGrams(
      [
        { date: "2026-10-26", isRedMeat: true, grams: 100 },
        { date: "2026-10-28", isRedMeat: true, grams: 50 },
        { date: "2026-10-30", isRedMeat: true, grams: 25 },
        { date: "2026-10-31", isRedMeat: true, grams: 80 },
        { date: "2026-11-01", isRedMeat: true, grams: 90 },
        { date: "2026-10-26", isRedMeat: false, grams: 200 },
        { date: "2026-10-25", isRedMeat: true, grams: 40 },
        { date: "2026-11-02", isRedMeat: true, grams: 70 },
      ],
      week,
    );
    expect(grams).toBe(175);
  });

  it("ignores weekend rows when the reference date is itself a weekend", () => {
    const grams = weeklyRedMeatGrams(
      [
        { date: "2026-10-26", isRedMeat: true, grams: 100 },
        { date: "2026-10-31", isRedMeat: true, grams: 80 },
        { date: "2026-11-01", isRedMeat: true, grams: 90 },
      ],
      "2026-11-01",
    );
    expect(grams).toBe(100);
  });

  it("keeps the Monday–Friday window across a year boundary", () => {
    // 2027-01-01 is a Friday; that week starts Monday 2026-12-28.
    const grams = weeklyRedMeatGrams(
      [
        { date: "2026-12-27", isRedMeat: true, grams: 40 },
        { date: "2026-12-28", isRedMeat: true, grams: 30 },
        { date: "2027-01-01", isRedMeat: true, grams: 20 },
        { date: "2027-01-02", isRedMeat: true, grams: 15 },
      ],
      "2027-01-01",
    );
    expect(grams).toBe(50);
  });

  it("treats a missing gram weight as nothing counted", () => {
    expect(
      weeklyRedMeatGrams([{ date: "2026-10-26", isRedMeat: true }], week),
    ).toBe(0);
  });
});

describe("goals", () => {
  it("matches the Laravel nutritional_limits defaults", () => {
    expect(DEFAULT_NUTRITION_LIMITS).toEqual({
      kcal: 2000,
      fat: 50,
      saturatedFat: 15,
      carbs: 220,
      sugar: 30,
      protein: 130,
    });
  });

  it("keeps the dietist red-meat cap and drink unit", () => {
    expect(RED_MEAT_WEEKLY_GRAMS).toBe(300);
    expect(CATEGORY_GOALS.vocht).toEqual({ max: 2000, unit: "ml" });
    expect(CATEGORY_GOALS.vlees.unit).toBe("g");
  });
});
