"use client";

import { useMutation, useQuery } from "convex/react";
import { Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { EatenTodayList } from "@/features/food/EatenTodayList";
import { FoodDateNav } from "@/features/food/FoodDateNav";
import { formatTableNumber } from "@/features/food/legacyFormat";
import { FOCUS_RING } from "@/features/food/products/focus";
import type { FoodMoment } from "@/shared/lib/food";
import { NUTRIENT_KEYS, sumNutrients, zeroNutrients, type NutrientKey, type Nutrients } from "@/shared/lib/nutrients";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { DiaryEntryForm } from "./EntryFormSheet";
import {
  adjacentDay,
  isDiaryDate,
  localTodayIso,
} from "./diaryModel";

const MOMENT_ORDER = [
  "voor_training",
  "na_training",
  "ontbijt",
  "lunch",
  "tussendoor",
  "diner",
] as const satisfies readonly FoodMoment[];

const SHORT_KEY: Record<NutrientKey, "kcal" | "fat" | "saturatedFat" | "carbs" | "sugar" | "protein"> = {
  kcal: "kcal",
  fat: "fat",
  saturatedFat: "saturatedFat",
  carbs: "carbs",
  sugar: "sugar",
  protein: "protein",
};

export function DiaryScreen() {
  const t = useTranslations("food.diary");
  const short = useTranslations("food.tableNutrientsShort");
  const totals = useTranslations("food.tableNutrients");
  const moments = useTranslations("food.moments");
  const locale = useLocale();
  const removeEntry = useMutation(api.foodEntries.remove);
  const [date, setDate] = useState(() => localTodayIso());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Doc<"foodEntries"> | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Doc<"foodEntries"> | null>(null);
  const [formKey, setFormKey] = useState(0);
  const formAnchor = useRef<HTMLDivElement>(null);
  const validDate = isDiaryDate(date);

  const entries = useQuery(api.foodEntries.listByDate, validDate ? { date } : "skip");

  useEffect(() => {
    if (!editing) return;
    formAnchor.current?.scrollIntoView({ block: "start" });
  }, [editing]);

  const rows = entries ? [...entries].reverse() : null;
  const dayTotal = entries ? sumNutrients(entries) : zeroNutrients();
  const loading = validDate && entries === undefined;

  function changeDate(next: string) {
    setDate(next);
    setEditing(null);
    setFormKey((key) => key + 1);
  }

  function finishSave(message: string) {
    setStatusMessage(message);
    setEditing(null);
    setFormKey((key) => key + 1);
  }

  return (
    <div className="pt-2">
      <section className="rounded-2xl border border-line px-3 py-4 sm:px-4">
        <FoodDateNav
          inputId="diary-date"
          date={date}
          valid={validDate}
          locale={locale}
          emptyLabel={t("chooseDate")}
          dateLabel={t("dateLabel")}
          previousLabel={t("previousDay")}
          nextLabel={t("nextDay")}
          onPrevious={() => changeDate(adjacentDay(date, "previous"))}
          onNext={() => changeDate(adjacentDay(date, "next"))}
          onChange={changeDate}
        />

        <div ref={formAnchor} className="mt-4">
          <DiaryEntryForm
            key={editing ? editing._id : `new-${formKey}`}
            date={date}
            existing={editing}
            onSaved={finishSave}
            onCancel={() => {
              setEditing(null);
              setFormKey((key) => key + 1);
            }}
          />
        </div>

        <p aria-live="polite" className="sr-only">
          {statusMessage ?? ""}
        </p>
        {statusMessage ? (
          <p className="mt-4 rounded-xl border border-green/40 bg-green/10 px-3 py-2 text-sm text-ink">
            {statusMessage}
          </p>
        ) : null}
        {deleteError ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {deleteError}
          </p>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-[13px]">
            <caption className="sr-only">{t("entriesHeading")}</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="px-2 py-2 font-semibold">{t("columns.moment")}</th>
                <th scope="col" className="px-2 py-2 font-semibold">{t("columns.product")}</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">{t("columns.gram")}</th>
                {NUTRIENT_KEYS.map((key) => (
                  <th key={key} scope="col" className="px-2 py-2 text-right font-semibold">
                    {short(SHORT_KEY[key])}
                  </th>
                ))}
                <th scope="col" className="sr-only">{t("edit")}</th>
              </tr>
            </thead>
            <tbody>
              {loading || !rows ? (
                <tr>
                  <td colSpan={10} className="px-2 py-3 text-sm text-muted">
                    {validDate ? t("loading") : t("chooseDate")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-2 py-3 text-sm text-muted">
                    {t("nothingLogged")}
                  </td>
                </tr>
              ) : (
                rows.map((entry) => (
                  <tr key={entry._id} className="border-b border-line">
                    <td className="px-2 py-2 text-ink">{moments(entry.moment)}</td>
                    <th scope="row" className="px-2 py-2 text-left text-[13px] font-normal text-ink">
                      {entry.productName}
                    </th>
                    <td className="px-2 py-2 text-right text-ink tabular-nums">{gramCell(entry)}</td>
                    {NUTRIENT_KEYS.map((key) => (
                      <td key={key} className="px-2 py-2 text-right text-ink tabular-nums">
                        {formatTableNumber(entry.totals[key])}
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <div className="flex">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setEditing(entry);
                          }}
                          aria-label={t("editNamed", { name: entry.productName })}
                          className={`inline-flex min-h-11 min-w-11 items-center justify-center text-[#f0c14a] ${FOCUS_RING}`}
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setPendingDelete(entry);
                          }}
                          aria-label={t("deleteNamed", { name: entry.productName })}
                          className={`inline-flex min-h-11 min-w-11 items-center justify-center text-muted ${FOCUS_RING}`}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {entries ? (
          <>
        <h2 className="mt-6 mb-2 text-sm font-medium text-ink">{t("momentOverview")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-[13px]">
            <caption className="sr-only">{t("momentOverview")}</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="px-2 py-2 font-semibold">{t("columns.moment")}</th>
                {NUTRIENT_KEYS.map((key) => (
                  <th key={key} scope="col" className="px-2 py-2 text-right font-semibold">
                    {totals(SHORT_KEY[key])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOMENT_ORDER.map((moment) => {
                const subtotal = subtotalFor(entries ?? [], moment);
                return (
                  <tr key={moment} className="border-b border-line">
                    <th scope="row" className="px-2 py-2 text-left text-[13px] font-normal text-ink">
                      {moments(moment)}
                    </th>
                    {NUTRIENT_KEYS.map((key) => (
                      <td key={key} className="px-2 py-2 text-right text-ink tabular-nums">
                        {formatTableNumber(subtotal[key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <th scope="row" className="px-2 py-2 text-left text-[13px] font-semibold text-ink">
                  {t("totalRow")}
                </th>
                {NUTRIENT_KEYS.map((key) => (
                  <td key={key} className="px-2 py-2 text-right font-semibold text-ink tabular-nums">
                    {formatTableNumber(dayTotal[key])}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
          </>
        ) : null}
      </section>

      {rows ? <EatenTodayList entries={rows} emptyLabel={t("nothingLogged")} /> : null}

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
          if (editing?._id === entry._id) {
            setEditing(null);
            setFormKey((key) => key + 1);
          }
          void removeEntry({ id: entry._id })
            .then(() => setStatusMessage(t("deleted")))
            .catch(() => setDeleteError(t("deleteFailed")));
        }}
      />
    </div>
  );
}

function gramCell(entry: { category?: string; grams?: number; ml?: number }): string {
  if (entry.category === "vocht") return `${formatTableNumber(entry.ml ?? 0)} ml`;
  return formatTableNumber(entry.grams ?? 0);
}

function subtotalFor(entries: readonly { moment: FoodMoment; totals: Nutrients }[], moment: FoodMoment): Nutrients {
  return sumNutrients(entries.filter((entry) => entry.moment === moment));
}
