"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { api } from "@/convex/_generated/api";
import { addIsoDays, FOOD_CATEGORIES } from "@/shared/lib/food";
import { CATEGORY_GOALS } from "@/shared/lib/goals";
import {
  RED_MEAT_LIMIT,
  adjacentDay,
  diaryRedMeatGrams,
  formatDiaryDate,
  formatDiaryNumber,
  formatRangeDay,
  formatShortDiaryDate,
  isDiaryDate,
  limitReadout,
  localTodayIso,
  redMeatWeekRange,
} from "@/features/food/diary/diaryModel";
import { LimitMeter } from "@/features/food/diary/LimitMeter";
import { FOCUS_RING } from "@/features/food/products/focus";
import { CATEGORY_LABEL, DIETIST_COPY } from "./copy";
import { CategoryDonut } from "./CategoryDonut";
import { categoryAmounts, foodsByCategory, weekdayCategoryRows } from "./dietistModel";

type DietistTab = "day" | "week";

export function DietistScreen() {
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
  const eaten = dayEntries ? foodsByCategory(dayEntries) : [];
  const redMeat = weekEntries && valid ? diaryRedMeatGrams(weekEntries, anchor) : null;
  const weekRows = weekEntries && week ? weekdayCategoryRows(weekEntries, week.start) : null;
  const loadingDay = valid && dayEntries === undefined;
  const loadingWeek = valid && (weekEntries === undefined || redMeat === null);

  function selectTab(next: DietistTab) {
    setTab(next);
    (next === "day" ? dayTabRef : weekTabRef).current?.focus();
  }

  function onTabKey(event: React.KeyboardEvent, current: DietistTab) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    selectTab(current === "day" ? "week" : "day");
  }

  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between gap-3 pt-6.5 pb-4.5">
        <h1 className="text-[26px] font-extrabold tracking-tight">{DIETIST_COPY.heading}</h1>
        <Link href="/food" className={`text-[13px] font-semibold text-blue underline ${FOCUS_RING}`}>
          {DIETIST_COPY.backToFood}
        </Link>
      </div>

      <div role="tablist" aria-label={DIETIST_COPY.viewLabel} className="mb-4 flex gap-2">
        <TabButton
          buttonRef={dayTabRef}
          selected={tab === "day"}
          controls="dietist-day"
          onSelect={() => selectTab("day")}
          onKeyDown={(event) => onTabKey(event, "day")}
        >
          {DIETIST_COPY.dayTab}
        </TabButton>
        <TabButton
          buttonRef={weekTabRef}
          selected={tab === "week"}
          controls="dietist-week"
          onSelect={() => selectTab("week")}
          onKeyDown={(event) => onTabKey(event, "week")}
        >
          {DIETIST_COPY.weekTab}
        </TabButton>
      </div>

      <div
        id="dietist-day"
        role="tabpanel"
        aria-labelledby="dietist-tab-day"
        hidden={tab !== "day"}
      >
        <DayNavigator
          inputId="dietist-day-date"
          anchor={anchor}
          valid={valid}
          previousLabel={DIETIST_COPY.previousDay}
          nextLabel={DIETIST_COPY.nextDay}
          onPrevious={() => setAnchor(adjacentDay(anchor, "previous"))}
          onNext={() => setAnchor(adjacentDay(anchor, "next"))}
          onChange={setAnchor}
        />
        <p aria-live="polite" className="mb-4 text-sm text-muted">
          {valid ? formatDiaryDate(anchor) : DIETIST_COPY.chooseDate}
        </p>
        {loadingDay || !dayAmounts ? (
          <p className="text-sm text-muted">{valid ? DIETIST_COPY.loading : DIETIST_COPY.chooseDate}</p>
        ) : (
          <>
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">
              {DIETIST_COPY.donutHeading}
            </h2>
            <div aria-hidden="true" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FOOD_CATEGORIES.map((category) => (
                <CategoryDonut key={category} category={category} value={dayAmounts[category]} />
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                <caption className="mb-3 text-left text-sm text-muted">{DIETIST_COPY.tableCaption}</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="px-2 py-2 font-semibold text-muted">{DIETIST_COPY.categoryColumn}</th>
                    <th scope="col" className="px-2 py-2 font-semibold text-muted">{DIETIST_COPY.eatenColumn}</th>
                    <th scope="col" className="px-2 py-2 font-semibold text-muted">{DIETIST_COPY.goalColumn}</th>
                    <th scope="col" className="px-2 py-2 font-semibold text-muted">{DIETIST_COPY.statusColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {FOOD_CATEGORIES.map((category) => {
                    const goal = CATEGORY_GOALS[category];
                    const value = dayAmounts[category];
                    const readout = limitReadout(CATEGORY_LABEL[category], value, goal.max, goal.unit);
                    return (
                      <tr key={category} className="border-b border-line">
                        <th scope="row" className="px-2 py-2 font-semibold text-ink">{CATEGORY_LABEL[category]}</th>
                        <td className="px-2 py-2 text-ink">{formatDiaryNumber(value)} {goal.unit}</td>
                        <td className="px-2 py-2 text-ink">{formatDiaryNumber(goal.max)} {goal.unit}</td>
                        <td className={`px-2 py-2 text-ink ${readout.over ? "font-bold" : ""}`}>{readout.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <h2 className="mt-6 mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">
              {DIETIST_COPY.eatenHeading}
            </h2>
            {eaten.length === 0 ? (
              <p className="text-sm text-muted">{DIETIST_COPY.nothingLogged}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {eaten.map((group) => (
                  <section key={group.category} aria-labelledby={`eaten-${group.category}`} className="rounded-card border border-line bg-surface p-3.5">
                    <h3 id={`eaten-${group.category}`} className="text-sm font-bold text-ink">
                      {CATEGORY_LABEL[group.category]}
                    </h3>
                    <ul className="mt-2 flex flex-col gap-1">
                      {group.items.map((item, index) => (
                        <li key={`${item.name}-${index}`} className="flex justify-between gap-3 text-sm text-ink">
                          <span>{item.name}</span>
                          <span>{formatDiaryNumber(item.amount)} {item.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div
        id="dietist-week"
        role="tabpanel"
        aria-labelledby="dietist-tab-week"
        hidden={tab !== "week"}
      >
        <DayNavigator
          inputId="dietist-week-date"
          anchor={anchor}
          valid={valid}
          previousLabel={DIETIST_COPY.previousWeek}
          nextLabel={DIETIST_COPY.nextWeek}
          onPrevious={() => setAnchor(addIsoDays(anchor, -7))}
          onNext={() => setAnchor(addIsoDays(anchor, 7))}
          onChange={setAnchor}
        />
        <p aria-live="polite" className="mb-4 text-sm text-muted">
          {week ? `${formatShortDiaryDate(week.start)} – ${formatShortDiaryDate(week.end)}. ${DIETIST_COPY.redMeatNote}` : DIETIST_COPY.chooseDate}
        </p>
        {loadingWeek || redMeat === null || !weekRows ? (
          <p className="text-sm text-muted">{valid ? DIETIST_COPY.loading : DIETIST_COPY.chooseDate}</p>
        ) : (
          <>
            <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">
              {DIETIST_COPY.redMeatTitle}
            </h2>
            <LimitMeter label={DIETIST_COPY.redMeatMeter} value={redMeat} limit={RED_MEAT_LIMIT} unit={DIETIST_COPY.unitGrams} />
            <h2 className="mt-6 mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">
              {DIETIST_COPY.weekHeading}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <caption className="mb-3 text-left text-sm text-muted">{DIETIST_COPY.weekTableCaption}</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="px-2 py-2 font-semibold text-muted">{DIETIST_COPY.categoryColumn}</th>
                    {weekRows.map((row) => (
                      <th key={row.date} scope="col" className="px-2 py-2 font-semibold text-muted">
                        {formatRangeDay(row.date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FOOD_CATEGORIES.map((category) => {
                    const goal = CATEGORY_GOALS[category];
                    return (
                      <tr key={category} className="border-b border-line">
                        <th scope="row" className="px-2 py-2 font-semibold text-ink">{CATEGORY_LABEL[category]}</th>
                        {weekRows.map((row) => {
                          const value = row.amounts[category];
                          const readout = limitReadout(CATEGORY_LABEL[category], value, goal.max, goal.unit);
                          return (
                            <td key={row.date} className={`px-2 py-2 text-ink ${readout.over ? "font-bold" : ""}`}>
                              {formatDiaryNumber(value)} {goal.unit}
                              {readout.over ? ` ${DIETIST_COPY.over}` : ""}
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

function DayNavigator({
  inputId,
  anchor,
  valid,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onChange,
}: {
  inputId: string;
  anchor: string;
  valid: boolean;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-2 flex items-end gap-2">
      <button
        type="button"
        aria-label={previousLabel}
        disabled={!valid}
        onClick={onPrevious}
        className={`min-h-11 shrink-0 rounded-xl bg-surface px-3 text-sm font-bold text-blue disabled:opacity-40 ${FOCUS_RING}`}
      >
        {DIETIST_COPY.previous}
      </button>
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="mb-1 block text-[12.5px] font-semibold text-muted">
          {DIETIST_COPY.dateLabel}
        </label>
        <input
          id={inputId}
          type="date"
          value={valid ? anchor : ""}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink focus:border-blue ${FOCUS_RING}`}
        />
      </div>
      <button
        type="button"
        aria-label={nextLabel}
        disabled={!valid}
        onClick={onNext}
        className={`min-h-11 shrink-0 rounded-xl bg-surface px-3 text-sm font-bold text-blue disabled:opacity-40 ${FOCUS_RING}`}
      >
        {DIETIST_COPY.next}
      </button>
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
      className={`min-h-11 rounded-xl px-4 text-sm font-bold ${FOCUS_RING} ${
        selected ? "bg-blue text-black" : "bg-surface-2 text-ink"
      }`}
    >
      {children}
    </button>
  );
}
