import { describe, expect, it } from "vitest";
import {
  categoryAmounts,
  donutDash,
  foodsByCategory,
  weekdayCategoryRows,
} from "./dietistModel";

describe("categoryAmounts", () => {
  it("sums grams, and millilitres for drinks", () => {
    const amounts = categoryAmounts([
      { category: "groente", grams: 100 },
      { category: "groente", grams: 40 },
      { category: "vocht", ml: 250, grams: 999 },
      { category: "vlees", grams: 80 },
    ]);
    expect(amounts.groente).toBe(140);
    expect(amounts.vocht).toBe(250);
    expect(amounts.vlees).toBe(80);
    expect(amounts.fruit).toBe(0);
  });
});

describe("foodsByCategory", () => {
  it("groups the day's foods and skips empty categories", () => {
    const groups = foodsByCategory([
      { date: "2026-10-28", category: "vocht", productName: "Water", ml: 300 },
      { date: "2026-10-28", category: "fruit", productName: "Apple", grams: 150 },
    ]);
    expect(groups.map((group) => group.category)).toEqual(["fruit", "vocht"]);
    expect(groups[1]?.items[0]).toEqual({ name: "Water", amount: 300, unit: "ml" });
  });
});

describe("weekdayCategoryRows", () => {
  it("is Monday through Friday and ignores the weekend", () => {
    const rows = weekdayCategoryRows(
      [
        { date: "2026-10-26", category: "vlees", productName: "Beef", grams: 50 },
        { date: "2026-10-31", category: "vlees", productName: "Steak", grams: 90 },
      ],
      "2026-10-26",
    );
    expect(rows.map((row) => row.date)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
    ]);
    expect(rows[0]?.amounts.vlees).toBe(50);
    expect(rows.every((row) => row.date !== "2026-10-31")).toBe(true);
  });
});

describe("donutDash", () => {
  it("caps the ring at a full circle when the goal is passed", () => {
    expect(donutDash(40)).toBe("40 60");
    expect(donutDash(140)).toBe("100 0");
    expect(donutDash(-5)).toBe("0 100");
  });
});
