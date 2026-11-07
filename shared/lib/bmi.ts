/**
 * BMI calculation per docs/bmi-calculation.md — WHO adult (18+)
 * classification. Kept separate from any UI so it can be reused (and
 * extended for children, an ideal-weight calculator, or imperial units)
 * without touching presentation code.
 */

export type BmiCategory = "underweight" | "healthy" | "overweight" | "obesity";

export type BmiInputError = "weightInvalid" | "heightInvalid";

/** WHO adult BMI thresholds (kg/m²), checked in ascending order. */
const ADULT_THRESHOLDS: { belowMax: number; category: BmiCategory }[] = [
  { belowMax: 18.5, category: "underweight" },
  { belowMax: 25, category: "healthy" },
  { belowMax: 30, category: "overweight" },
  { belowMax: Infinity, category: "obesity" },
];

/** Adult (18+) BMI category for a given BMI value, per WHO classification. */
export function bmiCategoryForAdult(bmi: number): BmiCategory {
  return ADULT_THRESHOLDS.find((t) => bmi < t.belowMax)!.category;
}

/**
 * Adult BMI: weight(kg) / height(m)², rounded to one decimal place.
 * Callers must validate inputs first (see `validateBmiInputs`) — this
 * function assumes both values are positive, finite numbers.
 */
export function calculateAdultBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/** Returns a message key when the inputs are invalid, else null. */
export function validateBmiInputs(weightKg: number, heightCm: number): BmiInputError | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return "weightInvalid";
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    return "heightInvalid";
  }
  return null;
}
