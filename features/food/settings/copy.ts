/** User-facing strings for the nutrition limits screen. The next-intl PR can replace this module. */
export const LIMITS_COPY = {
  pageTitle: "Limits",
  heading: "Nutrition limits",
  backToFood: "Food",
  intro: "Daily targets for the diary and overview.",
  defaultsHint: (
    kcal: string,
    fat: string,
    saturatedFat: string,
    carbs: string,
    sugar: string,
    protein: string,
  ) =>
    `If you haven't saved limits yet, these suggested defaults are filled in: ${kcal} kcal, ${fat} g fat, ${saturatedFat} g saturated fat, ${carbs} g carbs, ${sugar} g sugar, and ${protein} g protein.`,
  calories: "Calories (kcal)",
  fat: "Fat (g)",
  saturatedFat: "Saturated fat (g)",
  carbs: "Carbs (g)",
  sugar: "Sugar (g)",
  protein: "Protein (g)",
  save: "Save limits",
  saving: "Saving…",
  saved: "Limits saved.",
  saveFailed: "Couldn't save the limits.",
  invalid: "Enter a number that is 0 or more.",
  loading: "Loading limits.",
} as const;
