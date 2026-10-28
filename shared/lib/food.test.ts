import { describe, expect, it } from "vitest";
import {
  FOOD_CATEGORIES,
  FOOD_MOMENTS,
  mondayOfWeek,
  resolveEntryAmount,
  resolveIsRedMeat,
} from "./food";

describe("food domain", () => {
  it("uses the Laravel moment and category ids", () => {
    expect(FOOD_MOMENTS).toEqual([
      "ontbijt",
      "lunch",
      "tussendoor",
      "diner",
      "voor_training",
      "na_training",
    ]);
    expect(FOOD_CATEGORIES).toEqual([
      "groente",
      "fruit",
      "koolhydraten",
      "vlees",
      "noten",
      "zuivel",
      "kaas",
      "bereidingsvet",
      "margarine",
      "onbekend",
      "vocht",
    ]);
  });

  it("logs drinks in ml and everything else in grams", () => {
    expect(resolveEntryAmount("vocht", undefined, 250)).toEqual({
      ml: 250,
      amount: 250,
    });
    expect(resolveEntryAmount("vlees", 80, undefined)).toEqual({
      grams: 80,
      amount: 80,
    });
    expect(() => resolveEntryAmount("vocht", 80, undefined)).toThrow(/ml/);
    expect(() => resolveEntryAmount("vlees", undefined, 250)).toThrow(/ml/);
  });

  it("only keeps the red-meat flag on vlees", () => {
    expect(resolveIsRedMeat("vlees", true)).toBe(true);
    expect(resolveIsRedMeat("vlees", false)).toBe(false);
    expect(resolveIsRedMeat("groente", true)).toBe(false);
    expect(resolveIsRedMeat(undefined, true)).toBe(false);
  });

  it("treats Sunday as part of the previous Monday", () => {
    expect(mondayOfWeek("2026-11-01")).toBe("2026-10-26");
    expect(mondayOfWeek("2026-10-26")).toBe("2026-10-26");
    expect(mondayOfWeek("2027-01-01")).toBe("2026-12-28");
  });
});
