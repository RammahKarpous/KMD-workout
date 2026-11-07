import { describe, expect, it } from "vitest";
import type { Nutrients } from "@/shared/lib/nutrients";
import {
  adjacentDay,
  diaryRedMeatGrams,
  entryAmountText,
  formatDiaryDate,
  formatRangeDay,
  groupEntriesByMoment,
  limitReadout,
  localTodayIso,
  parsePortion,
  portionKind,
  redMeatWeekRange,
  validateEntryForm,
} from "./diaryModel";

const totals = (kcal: number): Nutrients => ({
  kcal,
  fat: 1,
  saturatedFat: 0,
  carbs: 2,
  sugar: 0,
  protein: 3,
});

describe("localTodayIso", () => {
  it("uses the calendar date in local time", () => {
    expect(localTodayIso(new Date(2026, 9, 28, 23, 45))).toBe("2026-10-28");
  });
});

describe("diary dates", () => {
  it("steps across month and year boundaries", () => {
    expect(adjacentDay("2026-10-01", "previous")).toBe("2026-09-30");
    expect(adjacentDay("2026-12-31", "next")).toBe("2027-01-01");
  });

  it("formats the weekday of the calendar date", () => {
    expect(formatDiaryDate("2026-10-28", "en")).toBe("Wednesday, October 28, 2026");
    expect(formatDiaryDate("2026-10-28", "nl")).toBe("woensdag 28 oktober 2026");
    expect(formatRangeDay("2026-10-28", "en")).toBe("Wed, Oct 28");
  });

  it("uses Monday to Friday for the red-meat week", () => {
    expect(redMeatWeekRange("2026-11-01")).toEqual({
      start: "2026-10-26",
      end: "2026-10-30",
    });
  });
});

describe("diaryRedMeatGrams", () => {
  it("counts Monday through Friday only", () => {
    expect(
      diaryRedMeatGrams(
        [
          { date: "2026-10-26", isRedMeat: true, grams: 100 },
          { date: "2026-10-31", isRedMeat: true, grams: 80 },
          { date: "2026-11-01", isRedMeat: true, grams: 90 },
        ],
        "2026-10-28",
      ),
    ).toBe(100);
  });
});

describe("groupEntriesByMoment", () => {
  it("orders moments ontbijt through na_training and sums each group", () => {
    const groups = groupEntriesByMoment([
      { moment: "diner" as const, totals: totals(40), name: "late" },
      { moment: "ontbijt" as const, totals: totals(10), name: "second" },
      { moment: "ontbijt" as const, totals: totals(5), name: "first" },
    ]);
    expect(groups.map((group) => group.moment)).toEqual(["ontbijt", "diner"]);
    expect(groups[0]?.entries.map((entry) => entry.name)).toEqual(["second", "first"]);
    expect(groups[0]?.subtotal.kcal).toBe(15);
  });
});

describe("limitReadout", () => {
  it("treats the limit itself as not over, and names the overflow", () => {
    expect(limitReadout(2000, 2000).over).toBe(false);
    expect(limitReadout(2000, 2000).atLimit).toBe(true);
    const over = limitReadout(62.5, 50);
    expect(over.over).toBe(true);
    expect(over.overBy).toBe(12.5);
    expect(over.fillPercent).toBe(100);
  });
});

describe("entry form", () => {
  it("accepts a comma amount and only keeps red meat on vlees", () => {
    const result = validateEntryForm({
      moment: "diner",
      category: "groente",
      amount: "1,5",
      isRedMeat: true,
      productId: "product-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.amount).toBe(1.5);
    expect(result.value.isRedMeat).toBe(false);
  });

  it("requires a product, a moment, and an amount above 0", () => {
    const result = validateEntryForm({
      moment: "",
      category: "vocht",
      amount: "0",
      isRedMeat: false,
      productId: null,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.moment).toBeTruthy();
    expect(result.errors.amount).toBeTruthy();
    expect(result.errors.productId).toBeTruthy();
  });

  it("logs drinks in ml", () => {
    expect(portionKind("vocht")).toBe("ml");
    expect(portionKind("vlees")).toBe("grams");
    expect(entryAmountText({ category: "vocht", ml: 250 })).toBe("250 ml");
    expect(parsePortion("2,5")).toBe(2.5);
  });
});
