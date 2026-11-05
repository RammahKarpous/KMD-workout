import { describe, expect, it } from "vitest";
import {
  formatCategoryAmount,
  formatMacroAmount,
  formatProgressPercent,
  formatTableNumber,
  isOverGoal,
} from "./legacyFormat";

describe("legacy food formats", () => {
  it("matches the daily macro table", () => {
    expect(formatMacroAmount(1195.7, "kcal")).toBe("1,195.7kcal");
    expect(formatMacroAmount(1600, "kcal")).toBe("1,600.0kcal");
    expect(formatMacroAmount(33.1, "g")).toBe("33.1g");
    expect(formatProgressPercent(1195.7, 1600)).toBe("74.7%");
    expect(formatProgressPercent(33.1, 50)).toBe("66.2%");
    expect(isOverGoal(33.1, 50)).toBe(false);
  });

  it("matches the category table, including a goal that was passed", () => {
    expect(formatCategoryAmount(0, "g")).toBe("0g");
    expect(formatCategoryAmount(250, "g")).toBe("250g");
    expect(formatCategoryAmount(2000, "ml")).toBe("2000ml");
    expect(formatCategoryAmount(493, "g")).toBe("493g");
    expect(formatProgressPercent(493, 100)).toBe("493.0%");
    expect(formatProgressPercent(0, 250)).toBe("0.0%");
    expect(isOverGoal(493, 100)).toBe(true);
  });

  it("writes diary cells with two decimals", () => {
    expect(formatTableNumber(0)).toBe("0.00");
    expect(formatTableNumber(22.5)).toBe("22.50");
    expect(formatTableNumber(1195.7)).toBe("1,195.70");
  });
});
