"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { formatDiaryNumber, formatRangeDay, isDiaryDate, localTodayIso } from "@/features/food/diary/diaryModel";
import { useLimitText } from "@/features/food/useLimitText";
import { NUTRIENT_KEYS } from "@/shared/lib/nutrients";
import { FOCUS_RING } from "@/features/food/products/focus";
import { dailyTotals, formatPeriodLabel, periodRange, shiftAnchor, type RangeKind } from "./overviewModel";

export function OverviewScreen() {
  const t = useTranslations("food.overview");
  const nutrients = useTranslations("food.nutrients");
  const locale = useLocale();
  const limitText = useLimitText();
  const [anchor, setAnchor] = useState(() => localTodayIso());
  const [kind, setKind] = useState<RangeKind>("week");
  const valid = isDiaryDate(anchor);
  const range = valid ? periodRange(anchor, kind) : null;
  const entries = useQuery(
    api.foodEntries.listByDateRange,
    range ? { startDate: range.start, endDate: range.end } : "skip",
  );
  const limits = useQuery(api.nutritionLimits.get);
  const rows = entries && range ? dailyTotals(entries, range.start, range.end) : null;
  const loading = valid && (entries === undefined || limits === undefined);

  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between gap-3 pt-6.5 pb-4.5">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t("heading")}</h1>
        <Link href="/food" className={`text-[13px] font-semibold text-blue underline ${FOCUS_RING}`}>
          {t("backToFood")}
        </Link>
      </div>

      <div role="group" aria-label={t("rangeLabel")} className="mb-4 flex gap-2">
        <RangeButton pressed={kind === "week"} onClick={() => setKind("week")}>
          {t("week")}
        </RangeButton>
        <RangeButton pressed={kind === "month"} onClick={() => setKind("month")}>
          {t("month")}
        </RangeButton>
      </div>

      <div className="mb-4 flex items-end gap-2">
        <button
          type="button"
          aria-label={kind === "week" ? t("previousWeek") : t("previousMonth")}
          disabled={!valid}
          onClick={() => setAnchor(shiftAnchor(anchor, kind, "previous"))}
          className={`min-h-11 shrink-0 rounded-xl bg-surface px-3 text-sm font-bold text-blue disabled:opacity-40 ${FOCUS_RING}`}
        >
          {t("previous")}
        </button>
        <div className="min-w-0 flex-1">
          <label htmlFor="overview-anchor" className="mb-1 block text-[12.5px] font-semibold text-muted">
            {kind === "week" ? t("anchorLabelWeek") : t("anchorLabelMonth")}
          </label>
          <input
            id="overview-anchor"
            type="date"
            value={valid ? anchor : ""}
            onChange={(event) => setAnchor(event.target.value)}
            className={`w-full rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink focus:border-blue ${FOCUS_RING}`}
          />
        </div>
        <button
          type="button"
          aria-label={kind === "week" ? t("nextWeek") : t("nextMonth")}
          disabled={!valid}
          onClick={() => setAnchor(shiftAnchor(anchor, kind, "next"))}
          className={`min-h-11 shrink-0 rounded-xl bg-surface px-3 text-sm font-bold text-blue disabled:opacity-40 ${FOCUS_RING}`}
        >
          {t("next")}
        </button>
      </div>
      <p aria-live="polite" className="mb-4 text-sm text-muted">
        {valid ? formatPeriodLabel(anchor, kind, locale) : t("chooseDate")}
      </p>

      {loading || !rows || !limits ? (
        <p className="text-sm text-muted">{valid ? t("loading") : t("chooseDate")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <caption className="mb-3 text-left text-sm text-muted">{t("tableCaption")}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-2 py-2 font-semibold text-muted">
                  {t("dayColumn")}
                </th>
                {NUTRIENT_KEYS.map((key) => (
                  <th key={key} scope="col" className="px-2 py-2 font-semibold text-muted">
                    {nutrients(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date} className="border-b border-line">
                  <th scope="row" className="px-2 py-2 font-semibold text-ink">
                    {formatRangeDay(row.date, locale)}
                  </th>
                  {NUTRIENT_KEYS.map((key) => {
                    const unit = key === "kcal" ? t("unitKcal") : t("unitGrams");
                    const readout = limitText(nutrients(key), row.totals[key], limits[key], unit);
                    return (
                      <td key={key} className={`px-2 py-2 text-ink ${readout.over ? "font-bold" : ""}`}>
                        {formatDiaryNumber(row.totals[key])} / {formatDiaryNumber(limits[key])} {unit}
                        {readout.over ? ` ${t("over")}` : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RangeButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-xl px-4 text-sm font-bold ${FOCUS_RING} ${
        pressed ? "bg-blue text-black" : "bg-surface-2 text-ink"
      }`}
    >
      {children}
    </button>
  );
}
