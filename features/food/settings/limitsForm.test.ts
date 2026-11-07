import { describe, expect, it } from "vitest";
import { DEFAULT_NUTRITION_LIMITS } from "@/shared/lib/goals";
import { defaultLimitValues, formFromLimits, validateLimitsForm } from "./limitsForm";

describe("validateLimitsForm", () => {
  it("accepts comma decimals and zero", () => {
    const result = validateLimitsForm({
      ...formFromLimits(DEFAULT_NUTRITION_LIMITS),
      fat: "15,5",
      sugar: "0",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fat).toBe(15.5);
    expect(result.value.sugar).toBe(0);
    expect(result.value.kcal).toBe(2000);
  });

  it("rejects an empty or negative limit", () => {
    const result = validateLimitsForm({
      ...formFromLimits(DEFAULT_NUTRITION_LIMITS),
      kcal: "",
      protein: "-1",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.kcal).toBeTruthy();
    expect(result.errors.protein).toBeTruthy();
  });
});

describe("defaultLimitValues", () => {
  it("names the suggested defaults", () => {
    expect(defaultLimitValues().kcal).toBe("2000");
    expect(defaultLimitValues().protein).toBe("130");
  });
});
