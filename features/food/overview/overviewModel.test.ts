import { describe, expect, it } from "vitest";
import { dailyTotals, formatPeriodLabel, periodLength, periodRange, shiftAnchor, shiftMonth } from "./overviewModel";

describe("periodRange", () => {
  it("uses Monday to Sunday for a week and stays within a month", () => {
    expect(periodRange("2026-10-28", "week")).toEqual({
      start: "2026-10-26",
      end: "2026-11-01",
    });
    expect(periodLength("2026-10-28", "week")).toBe(7);
    expect(periodLength("2026-01-15", "month")).toBe(31);
    expect(periodLength("2026-02-15", "month")).toBe(28);
    expect(periodLength("2024-02-10", "month")).toBe(29);
  });

  it("clamps the anchor day when the next month is shorter", () => {
    expect(shiftMonth("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftAnchor("2026-10-28", "week", "next")).toBe("2026-11-04");
  });

  it("labels a week by its dates and a month by its name", () => {
    expect(formatPeriodLabel("2026-10-28", "week")).toBe("26 Oct – 1 Nov");
    expect(formatPeriodLabel("2026-10-28", "month")).toBe("October 2026");
  });
});

describe("dailyTotals", () => {
  it("fills days that have no entries with zeros, in order", () => {
    const rows = dailyTotals(
      [
        {
          date: "2026-10-27",
          totals: { kcal: 10, fat: 1, saturatedFat: 0, carbs: 2, sugar: 0, protein: 3 },
        },
      ],
      "2026-10-26",
      "2026-10-27",
    );
    expect(rows.map((row) => row.date)).toEqual(["2026-10-26", "2026-10-27"]);
    expect(rows[0]?.totals.kcal).toBe(0);
    expect(rows[1]?.totals.kcal).toBe(10);
  });
});
