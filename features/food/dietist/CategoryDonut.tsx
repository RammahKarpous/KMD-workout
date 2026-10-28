"use client";

import { useTranslations } from "next-intl";
import { CATEGORY_GOALS } from "@/shared/lib/goals";
import type { FoodCategory } from "@/shared/lib/food";
import { formatDiaryNumber } from "@/features/food/diary/diaryModel";
import { useLimitText } from "@/features/food/useLimitText";
import { donutDash } from "./dietistModel";

/**
 * Visual ring only. The dietist table is the text alternative, so the
 * surrounding grid is hidden from assistive tech.
 */
export function CategoryDonut({
  category,
  value,
}: {
  category: FoodCategory;
  value: number;
}) {
  const categories = useTranslations("food.categories");
  const text = useLimitText();
  const goal = CATEGORY_GOALS[category];
  const label = categories(category);
  const readout = text(label, value, goal.max, goal.unit);
  return (
    <figure className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-3">
      <svg viewBox="0 0 36 36" className="h-24 w-24" aria-hidden="true">
        <circle cx="18" cy="18" r="15.9155" fill="none" className="stroke-surface-2" strokeWidth="3.5" />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          className={readout.over ? "stroke-danger" : "stroke-blue"}
          strokeWidth="3.5"
          strokeDasharray={donutDash(readout.fillPercent)}
          strokeDashoffset="25"
        />
      </svg>
      <figcaption className="text-center">
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="text-[13px] text-ink">
          {formatDiaryNumber(value)} / {formatDiaryNumber(goal.max)} {goal.unit}
        </p>
        <p className={`text-[13px] ${readout.over ? "font-bold text-ink" : "text-muted"}`}>
          {readout.detail}
        </p>
      </figcaption>
    </figure>
  );
}
