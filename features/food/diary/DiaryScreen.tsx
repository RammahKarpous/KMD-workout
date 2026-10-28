"use client";

import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { NUTRIENT_KEYS, sumNutrients } from "@/shared/lib/nutrients";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useSheet } from "@/shared/ui/SheetHost";
import { FOCUS_RING } from "@/features/food/products/focus";
import {
  adjacentDay,
  diaryRedMeatGrams,
  entryAmountText,
  formatDiaryDate,
  formatDiaryNumber,
  formatShortDiaryDate,
  groupEntriesByMoment,
  isDiaryDate,
  localTodayIso,
  redMeatWeekRange,
  RED_MEAT_LIMIT,
} from "./diaryModel";
import { EntryFormSheet } from "./EntryFormSheet";
import { LimitMeter } from "./LimitMeter";

export function DiaryScreen() {
  const t = useTranslations("food.diary");
  const nutrients = useTranslations("food.nutrients");
  const moments = useTranslations("food.moments");
  const categories = useTranslations("food.categories");
  const locale = useLocale();
  const { push } = useSheet();
  const removeEntry = useMutation(api.foodEntries.remove);
  const [date, setDate] = useState(() => localTodayIso());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Doc<"foodEntries"> | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const validDate = isDiaryDate(date);
  const week = validDate ? redMeatWeekRange(date) : null;

  const entries = useQuery(api.foodEntries.listByDate, validDate ? { date } : "skip");
  const limits = useQuery(api.nutritionLimits.get);
  const weekEntries = useQuery(
    api.foodEntries.listByDateRange,
    week ? { startDate: week.start, endDate: week.end } : "skip",
  );

  const groups = entries ? groupEntriesByMoment(entries) : [];
  const dayTotals = entries ? sumNutrients(entries) : null;
  const redMeat = weekEntries && validDate ? diaryRedMeatGrams(weekEntries, date) : null;
  const loading = entries === undefined || limits === undefined || redMeat === null;

  function openCreate() {
    if (!validDate) return;
    push("diary-entry", <EntryFormSheet date={date} onSaved={setStatusMessage} />);
  }

  function openEdit(entry: Doc<"foodEntries">) {
    push(
      "diary-entry",
      <EntryFormSheet date={entry.date} existing={entry} onSaved={setStatusMessage} />,
    );
  }

  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between gap-3 pt-6.5 pb-4.5">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t("heading")}</h1>
        <Link href="/food" className={`text-[13px] font-semibold text-blue underline ${FOCUS_RING}`}>
          {t("backToFood")}
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-label={t("previousDay")}
          disabled={!validDate}
          onClick={() => setDate(adjacentDay(date, "previous"))}
          className={`min-h-11 shrink-0 rounded-xl bg-surface px-3 text-sm font-bold text-blue disabled:opacity-40 ${FOCUS_RING}`}
        >
          {t("previous")}
        </button>
        <div className="min-w-0 flex-1">
          <label htmlFor="diary-date" className="mb-1 block text-[12.5px] font-semibold text-muted">
            {t("dateLabel")}
          </label>
          <input
            id="diary-date"
            type="date"
            value={validDate ? date : ""}
            aria-describedby="diary-date-long"
            onChange={(event) => setDate(event.target.value)}
            className={`w-full rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink focus:border-blue ${FOCUS_RING}`}
          />
        </div>
        <button
          type="button"
          aria-label={t("nextDay")}
          disabled={!validDate}
          onClick={() => setDate(adjacentDay(date, "next"))}
          className={`min-h-11 shrink-0 rounded-xl bg-surface px-3 text-sm font-bold text-blue disabled:opacity-40 ${FOCUS_RING}`}
        >
          {t("next")}
        </button>
      </div>
      <p id="diary-date-long" aria-live="polite" className="mb-4 text-sm text-muted">
        {validDate ? formatDiaryDate(date, locale) : t("chooseDate")}
      </p>

      <button
        type="button"
        onClick={openCreate}
        disabled={!validDate}
        className={`mb-5 w-full rounded-2xl bg-blue py-4 text-[15.5px] font-bold text-black disabled:opacity-40 ${FOCUS_RING}`}
      >
        {t("add")}
      </button>

      <p aria-live="polite" className="sr-only">
        {statusMessage ?? ""}
      </p>
      {statusMessage ? (
        <p className="mb-4 rounded-xl border border-green/40 bg-green/10 px-3 py-2 text-sm text-ink">
          {statusMessage}
        </p>
      ) : null}
      {deleteError ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          {deleteError}
        </p>
      ) : null}

      {loading || !dayTotals || !limits || redMeat === null || !week ? (
        <p className="text-sm text-muted" aria-live="polite">
          {validDate ? t("loading") : t("chooseDate")}
        </p>
      ) : (
        <>
          <section aria-labelledby="day-totals" className="mb-6 flex flex-col gap-4">
            <h2 id="day-totals" className="text-[13px] font-bold uppercase tracking-wide text-muted">
              {t("dayTotals")}
            </h2>
            {NUTRIENT_KEYS.map((key) => (
              <LimitMeter
                key={key}
                label={nutrients(key)}
                value={dayTotals[key]}
                limit={limits[key]}
                unit={key === "kcal" ? t("unitKcal") : t("unitGrams")}
              />
            ))}
          </section>

          <section aria-labelledby="red-meat" className="mb-6">
            <h2 id="red-meat" className="text-[13px] font-bold uppercase tracking-wide text-muted">
              {t("redMeatTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {t("weekRange", {
                start: formatShortDiaryDate(week.start, locale),
                end: formatShortDiaryDate(week.end, locale),
              })}.{" "}
              {t("redMeatNote")}
            </p>
            <div className="mt-3">
              <LimitMeter
                label={t("redMeatMeter")}
                value={redMeat}
                limit={RED_MEAT_LIMIT}
                unit={t("unitGrams")}
              />
            </div>
          </section>

          <section aria-labelledby="diary-entries">
            <h2 id="diary-entries" className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">
              {t("entriesHeading")}
            </h2>
            <p className="mb-3 text-sm text-muted">
              {entries && entries.length === 0 ? t("nothingLogged") : t("entryCount", { count: entries?.length ?? 0 })}
            </p>
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <section key={group.moment} aria-labelledby={`moment-${group.moment}`}>
                  <h3 id={`moment-${group.moment}`} className="text-[16px] font-bold text-ink">
                    {moments(group.moment)}
                  </h3>
                  <p className="mt-1 text-[12px] font-semibold text-muted">{t("subtotal")}</p>
                  <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                    {NUTRIENT_KEYS.map((key) => (
                      <div key={key}>
                        <dt className="text-[11px] font-semibold text-muted">{nutrients(key)}</dt>
                        <dd className="text-sm text-ink">
                          {formatDiaryNumber(group.subtotal[key])} {key === "kcal" ? t("unitKcal") : t("unitGrams")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <ul className="mt-2 flex flex-col gap-2">
                    {group.entries.map((entry) => (
                      <li key={entry._id}>
                        <article className="rounded-card border border-line bg-surface p-3.5">
                          <h4 className="text-[15px] font-bold text-ink">{entry.productName}</h4>
                          <p className="mt-0.5 text-sm text-muted">
                            {entryAmountText(entry)}
                            {entry.category ? ` · ${categories(entry.category)}` : ""}
                            {entry.isRedMeat ? ` · ${t("redMeatBadge")}` : ""}
                          </p>
                          <p className="mt-1 text-sm text-ink">
                            {formatDiaryNumber(entry.totals.kcal)} {t("unitKcal")}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(entry)}
                              aria-label={t("editNamed", { name: entry.productName })}
                              className={`min-h-11 flex-1 rounded-xl bg-surface-2 text-sm font-bold text-ink ${FOCUS_RING}`}
                            >
                              {t("edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setPendingDelete(entry);
                              }}
                              aria-label={t("deleteNamed", { name: entry.productName })}
                              className={`min-h-11 flex-1 rounded-xl bg-surface-2 text-sm font-bold text-danger ${FOCUS_RING}`}
                            >
                              {t("delete")}
                            </button>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        message={pendingDelete ? t("deleteConfirm", { name: pendingDelete.productName }) : ""}
        confirmLabel={t("delete")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const entry = pendingDelete;
          setPendingDelete(null);
          if (!entry) return;
          void removeEntry({ id: entry._id })
            .then(() => setStatusMessage(t("deleted")))
            .catch(() => setDeleteError(t("deleteFailed")));
        }}
      />
    </div>
  );
}
