"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { limitReadout, formatDiaryNumber, formatRangeDay, isDiaryDate, localTodayIso } from "@/features/food/diary/diaryModel";
import { FOCUS_RING } from "@/features/food/products/focus";
import { OVERVIEW_COPY, OVERVIEW_NUTRIENTS } from "./copy";
import { dailyTotals, formatPeriodLabel, periodRange, shiftAnchor, type RangeKind } from "./overviewModel";

export function OverviewScreen() {
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
        <h1 className="text-[26px] font-extrabold tracking-tight">{OVERVIEW_COPY.heading}</h1>
        <Link href="/food" className={`text-[13px] font-semibold text-blue underline ${FOCUS_RING}`}>
          {OVERVIEW_COPY.backToFood}
        </Link>
      </div>

      <div role="group" aria-label={OVERVIEW_COPY.rangeLabel} className="mb-4 flex gap-2">
        <RangeButton pressed={kind === "week"} onClick={() => setKind("week")}>
          {OVERVIEW_COPY.week}
        </RangeButton>
        <RangeButton pressed={kind === "month"} onClick={() => setKind("month")}>
          {OVERVIEW_COPY.month}
        </RangeButton>
      </div>

      <div className="mb-4 flex items-end gap-2">
        <button
          type="button"
          aria-label={kind === "week" ? OVERVIEW_COPY.previousWeek : OVERVIEW_COPY.previousMonth}
          disabled={!valid}
          onClick={() => setAnchor(shiftAnchor(anchor, kind, "previous"))}
          className={`min-h-11 shrink-0 rounded-xl bg-surface px-3 text-sm font-bold text-blue disabled:opacity-40 ${FOCUS_RING}`}
        >
          {OVERVIEW_COPY.previous}
        </button>
        <div className="min-w-0 flex-1">
          <label htmlFor="overview-anchor" className="mb-1 block text-[12.5px] font-semibold text-muted">
            {kind === "week" ? OVERVIEW_COPY.anchorLabelWeek : OVERVIEW_COPY.anchorLabelMonth}
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
          aria-label={kind === "week" ? OVERVIEW_COPY.nextWeek : OVERVIEW_COPY.nextMonth}
          disabled={!valid}
          onClick={() => setAnchor(shiftAnchor(anchor, kind, "next"))}
          className={`min-h-11 shrink-0 rounded-xl bg-surface px-3 text-sm font-bold text-blue disabled:opacity-40 ${FOCUS_RING}`}
        >
          {OVERVIEW_COPY.next}
        </button>
      </div>
      <p aria-live="polite" className="mb-4 text-sm text-muted">
        {valid ? formatPeriodLabel(anchor, kind) : OVERVIEW_COPY.chooseDate}
      </p>

      {loading || !rows || !limits ? (
        <p className="text-sm text-muted">{valid ? OVERVIEW_COPY.loading : OVERVIEW_COPY.chooseDate}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <caption className="mb-3 text-left text-sm text-muted">{OVERVIEW_COPY.tableCaption}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-2 py-2 font-semibold text-muted">
                  {OVERVIEW_COPY.dayColumn}
                </th>
                {OVERVIEW_NUTRIENTS.map((nutrient) => (
                  <th key={nutrient.key} scope="col" className="px-2 py-2 font-semibold text-muted">
                    {nutrient.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date} className="border-b border-line">
                  <th scope="row" className="px-2 py-2 font-semibold text-ink">
                    {formatRangeDay(row.date)}
                  </th>
                  {OVERVIEW_NUTRIENTS.map((nutrient) => {
                    const readout = limitReadout(
                      nutrient.label,
                      row.totals[nutrient.key],
                      limits[nutrient.key],
                      nutrient.unit,
                    );
                    return (
                      <td
                        key={nutrient.key}
                        className={`px-2 py-2 text-ink ${readout.over ? "font-bold" : ""}`}
                      >
                        {formatDiaryNumber(row.totals[nutrient.key])} / {formatDiaryNumber(limits[nutrient.key])}{" "}
                        {nutrient.unit}
                        {readout.over ? ` ${OVERVIEW_COPY.over}` : ""}
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
