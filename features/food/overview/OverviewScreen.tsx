"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { adjacentDay, isDiaryDate, localTodayIso } from "@/features/food/diary/diaryModel";
import { FoodDateNav } from "@/features/food/FoodDateNav";
import { formatMacroAmount } from "@/features/food/legacyFormat";
import { ProgressCell } from "@/features/food/ProgressCell";
import { useLimitText } from "@/features/food/useLimitText";
import { NUTRIENT_KEYS, sumNutrients, type NutrientKey } from "@/shared/lib/nutrients";

const ROW_KEY: Record<NutrientKey, "kcal" | "fat" | "saturatedFat" | "carbs" | "sugar" | "protein"> = {
  kcal: "kcal",
  fat: "fat",
  saturatedFat: "saturatedFat",
  carbs: "carbs",
  sugar: "sugar",
  protein: "protein",
};

export function OverviewScreen() {
  const t = useTranslations("food.overview");
  const rows = useTranslations("food.tableNutrients");
  const locale = useLocale();
  const limitText = useLimitText();
  const [anchor, setAnchor] = useState(() => localTodayIso());
  const valid = isDiaryDate(anchor);
  const entries = useQuery(api.foodEntries.listByDate, valid ? { date: anchor } : "skip");
  const limits = useQuery(api.nutritionLimits.get);
  const totals = entries ? sumNutrients(entries) : null;
  const loading = valid && (entries === undefined || limits === undefined);

  return (
    <div className="pt-2">
      <section className="rounded-2xl border border-line px-3 py-4 sm:px-5">
        <FoodDateNav
          inputId="overview-date"
          date={anchor}
          valid={valid}
          locale={locale}
          emptyLabel={t("chooseDate")}
          dateLabel={t("dateLabel")}
          previousLabel={t("previousDay")}
          nextLabel={t("nextDay")}
          onPrevious={() => setAnchor(adjacentDay(anchor, "previous"))}
          onNext={() => setAnchor(adjacentDay(anchor, "next"))}
          onChange={setAnchor}
        />

        <h1 className="mt-5 mb-3 text-sm font-medium text-ink">{t("dailyTitle")}</h1>

        {loading || !totals || !limits ? (
          <p className="text-sm text-muted">{valid ? t("loading") : t("chooseDate")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <caption className="sr-only">{t("tableCaption")}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-2 py-2 font-semibold text-ink">{t("nutrientColumn")}</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold text-ink">{t("eatenColumn")}</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold text-ink">{t("goalColumn")}</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold text-ink">{t("progressColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {NUTRIENT_KEYS.map((key) => {
                  const unit = key === "kcal" ? t("unitKcal") : t("unitGrams");
                  const label = rows(ROW_KEY[key]);
                  const readout = limitText(label, totals[key], limits[key], unit);
                  return (
                    <tr key={key} className="border-b border-line">
                      <th scope="row" className="px-2 py-3 text-left text-sm font-normal text-ink">
                        {label}
                      </th>
                      <td className="px-2 py-3 text-right text-ink tabular-nums">
                        {formatMacroAmount(totals[key], unit)}
                      </td>
                      <td className="px-2 py-3 text-right text-ink tabular-nums">
                        {formatMacroAmount(limits[key], unit)}
                      </td>
                      <td className="px-2 py-3">
                        <ProgressCell
                          label={label}
                          value={totals[key]}
                          limit={limits[key]}
                          valuetext={readout.valuetext}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
