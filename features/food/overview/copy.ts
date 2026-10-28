import type { NutrientKey } from "@/shared/lib/nutrients";

/** User-facing strings for the overview screen. The next-intl PR can replace this module. */
export const OVERVIEW_COPY = {
  pageTitle: "Overview",
  heading: "Overview",
  backToFood: "Food",
  rangeLabel: "Range",
  week: "Week",
  month: "Month",
  previousWeek: "Previous week",
  nextWeek: "Next week",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  previous: "Previous",
  next: "Next",
  anchorLabelWeek: "Week containing",
  anchorLabelMonth: "Month containing",
  tableCaption:
    "Each cell is that day's total compared with your daily limit. Over means above the limit.",
  dayColumn: "Day",
  loading: "Loading overview.",
  chooseDate: "Choose a date.",
  calories: "Calories",
  fat: "Fat",
  saturatedFat: "Saturated fat",
  carbs: "Carbs",
  sugar: "Sugar",
  protein: "Protein",
  unitKcal: "kcal",
  unitGrams: "g",
  over: "Over",
} as const;

export const OVERVIEW_NUTRIENTS: { key: NutrientKey; label: string; unit: string }[] = [
  { key: "kcal", label: OVERVIEW_COPY.calories, unit: OVERVIEW_COPY.unitKcal },
  { key: "fat", label: OVERVIEW_COPY.fat, unit: OVERVIEW_COPY.unitGrams },
  { key: "saturatedFat", label: OVERVIEW_COPY.saturatedFat, unit: OVERVIEW_COPY.unitGrams },
  { key: "carbs", label: OVERVIEW_COPY.carbs, unit: OVERVIEW_COPY.unitGrams },
  { key: "sugar", label: OVERVIEW_COPY.sugar, unit: OVERVIEW_COPY.unitGrams },
  { key: "protein", label: OVERVIEW_COPY.protein, unit: OVERVIEW_COPY.unitGrams },
];
