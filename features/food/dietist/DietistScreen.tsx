"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { api } from "@/convex/_generated/api";
import { EatenTodayList } from "@/features/food/EatenTodayList";
import { FoodDateNav } from "@/features/food/FoodDateNav";
import { addIsoDays, FOOD_CATEGORIES } from "@/shared/lib/food";
import { CATEGORY_GOALS } from "@/shared/lib/goals";
import {
  RED_MEAT_LIMIT,
  adjacentDay,
  diaryRedMeatGrams,
  formatDiaryNumber,
  formatRangeDay,
  formatShortDiaryDate,
  isDiaryDate,
  localTodayIso,
  redMeatWeekRange,
} from "@/features/food/diary/diaryModel";
import { LimitMeter } from "@/features/food/diary/LimitMeter";
import { formatCategoryAmount } from "@/features/food/legacyFormat";
import { ProgressCell } from "@/features/food/ProgressCell";
import { useLimitText } from "@/features/food/useLimitText";
import { FOCUS_RING } from "@/features/food/products/focus";
import { categoryAmounts, weekdayCategoryRows } from "./dietistModel";

type DietistTab = "day" | "week";

export function DietistScreen() {
  const t = useTranslations("food.dietist");
  const categories = useTranslations("food.categories");
  const locale = useLocale();
  const limitText = useLimitText();
  const [anchor, setAnchor] = useState(() => localTodayIso());
  const [tab, setTab] = useState<DietistTab>("day");
  const dayTabRef = useRef<HTMLButtonElement>(null);
  const weekTabRef = useRef<HTMLButtonElement>(null);
  const valid = isDiaryDate(anchor);
  const week = valid ? redMeatWeekRange(anchor) : null;

  const dayEntries = useQuery(api.foodEntries.listByDate, valid ? { date: anchor } : "skip");
  const weekEntries = useQuery(
    api.foodEntries.listByDateRange,
    week ? { startDate: week.start, endDate: week.end } : "skip",
  );

  const dayAmounts = dayEntries ? categoryAmounts(dayEntries) : null;
  const chronological = dayEntries ? [...dayEntries].reverse() : null;
  const redMeat = weekEntries && valid ? diaryRedMeatGrams(weekEntries, anchor) : null;
  const weekRows = weekEntries && week ? weekdayCategoryRows(weekEntries, week.start) : null;
  const loadingDay = valid && dayEntries === undefined;
  const loadingWeek = valid && (weekEntries === undefined || redMeat === null);

  function selectTab(next: DietistTab) {
    setTab(next);
    (next === "day" ? dayTabRef : weekTabRef).current?.focus();
  }

  function onTabKey(event: KeyboardEvent, current: DietistTab) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    selectTab(current === "day" ? "week" : "day");
  }

  return (
    <div className="pt-2">
      <div role="tablist" aria-label={t("viewLabel")} className="mb-4 flex justify-center gap-2">
        <TabButton
          buttonRef={dayTabRef}
          selected={tab === "day"}
          controls="dietist-day"
          onSelect={() => selectTab("day")}
          onKeyDown={(event) => onTabKey(event, "day")}
        >
          {t("dayTab")}
        </TabButton>
        <TabButton
          buttonRef={weekTabRef}
          selected={tab === "week"}
          controls="dietist-week"
          onSelect={() => selectTab("week")}
          onKeyDown={(event) => onTabKey(event, "week")}
        >
          {t("weekTab")}
        </TabButton>
      </div>

      <div id="dietist-day" role="tabpanel" aria-labelledby="dietist-tab-day" hidden={tab !== "day"}>
        <FoodDateNav
          inputId="dietist-day-date"
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
        {loadingDay || !dayAmounts ? (
          <p className="text-sm text-muted">{valid ? t("loading") : t("chooseDate")}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                <caption className="sr-only">{t("tableCaption")}</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="px-2 py-2 font-semibold text-ink">{t("categoryColumn")}</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold text-ink">{t("eatenColumn")}</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold text-ink">{t("goalColumn")}</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold text-ink">{t("progressColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {FOOD_CATEGORIES.map((category) => {
                    const goal = CATEGORY_GOALS[category];
                    const value = dayAmounts[category];
                    const label = categories(category);
                    const readout = limitText(label, value, goal.max, goal.unit);
                    return (
                      <tr key={category} className="border-b border-line">
                        <th scope="row" className="px-2 py-3 text-left text-sm font-normal text-ink">{label}</th>
                        <td className="px-2 py-3 text-right text-ink tabular-nums">
                          {formatCategoryAmount(value, goal.unit)}
                        </td>
                        <td className="px-2 py-3 text-right text-ink tabular-nums">
                          {formatCategoryAmount(goal.max, goal.unit)}
                        </td>
                        <td className="px-2 py-3">
                          <ProgressCell label={label} value={value} limit={goal.max} valuetext={readout.valuetext} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {chronological ? <EatenTodayList entries={chronological} emptyLabel={t("nothingLogged")} /> : null}
          </>
        )}
      </div>

      <div id="dietist-week" role="tabpanel" aria-labelledby="dietist-tab-week" hidden={tab !== "week"}>
        <FoodDateNav
          inputId="dietist-week-date"
          date={anchor}
          valid={valid}
          locale={locale}
          emptyLabel={t("chooseDate")}
          dateLabel={t("dateLabel")}
          previousLabel={t("previousWeek")}
          nextLabel={t("nextWeek")}
          onPrevious={() => setAnchor(addIsoDays(anchor, -7))}
          onNext={() => setAnchor(addIsoDays(anchor, 7))}
          onChange={setAnchor}
        />
        <p aria-live="polite" className="mt-3 mb-4 text-center text-sm text-muted">
          {week
            ? `${formatShortDiaryDate(week.start, locale)} – ${formatShortDiaryDate(week.end, locale)}. ${t("redMeatNote")}`
            : t("chooseDate")}
        </p>
        {loadingWeek || redMeat === null || !weekRows ? (
          <p className="text-sm text-muted">{valid ? t("loading") : t("chooseDate")}</p>
        ) : (
          <>
            <h2 className="mb-2 text-sm font-medium text-ink">{t("redMeatTitle")}</h2>
            <LimitMeter label={t("redMeatMeter")} value={redMeat} limit={RED_MEAT_LIMIT} unit={t("unitGrams")} />
            <h2 className="mt-6 mb-3 text-sm font-medium text-ink">{t("weekHeading")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <caption className="sr-only">{t("weekTableCaption")}</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="px-2 py-2 font-semibold text-muted">{t("categoryColumn")}</th>
                    {weekRows.map((row) => (
                      <th key={row.date} scope="col" className="px-2 py-2 font-semibold text-muted">
                        {formatRangeDay(row.date, locale)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FOOD_CATEGORIES.map((category) => {
                    const goal = CATEGORY_GOALS[category];
                    return (
                      <tr key={category} className="border-b border-line">
                        <th scope="row" className="px-2 py-2 font-semibold text-ink">{categories(category)}</th>
                        {weekRows.map((row) => {
                          const value = row.amounts[category];
                          const readout = limitText(categories(category), value, goal.max, goal.unit);
                          return (
                            <td key={row.date} className={`px-2 py-2 text-ink tabular-nums ${readout.over ? "font-bold text-danger" : ""}`}>
                              {formatDiaryNumber(value)} {goal.unit}
                              {readout.over ? ` ${t("over")}` : ""}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  buttonRef,
  selected,
  controls,
  onSelect,
  onKeyDown,
  children,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  selected: boolean;
  controls: string;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  children: string;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="tab"
      id={`dietist-tab-${controls === "dietist-day" ? "day" : "week"}`}
      aria-selected={selected}
      aria-controls={controls}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${FOCUS_RING} ${
        selected ? "bg-black text-ink ring-1 ring-white/80" : "bg-[#1b3f72] text-white"
      }`}
    >
      {children}
    </button>
  );
}
