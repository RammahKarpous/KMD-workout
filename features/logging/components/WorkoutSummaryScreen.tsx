"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SheetHeader } from "@/shared/ui/SheetHeader";

export function WorkoutSummaryScreen({
  title,
  stats,
  muscleSection,
  notes,
  onNotesChange,
  onNotesBlur,
  onDone,
}: {
  title: string;
  stats: { label: string; value: string; accent?: boolean }[];
  muscleSection?: ReactNode;
  notes: string;
  onNotesChange: (v: string) => void;
  onNotesBlur: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("logging");
  return (
    <div className="p-4">
      <SheetHeader title={t("saved")} onClose={onDone} />
      <h2 className="mt-1 mb-3.5 px-0.5 text-[26px] font-extrabold tracking-tight">
        {title}
      </h2>

      <div className="mb-4.5 flex gap-2.5 border-b border-line pb-4.5">
        {stats.map((s) => (
          <div key={s.label} className="flex-1">
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-2">
              {s.label}
            </div>
            <div
              className={`mt-1 text-2xl font-extrabold tracking-tight ${
                s.accent ? "text-blue" : ""
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {muscleSection && (
        <>
          <div className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-muted">
            {t("musclesWorked")}
          </div>
          {muscleSection}
        </>
      )}

      <div className="mt-4.5 mb-4.5">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">
          {t("noteOptional")}
        </label>
        <textarea
          placeholder={t("notePlaceholder")}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          onBlur={onNotesBlur}
          className="min-h-18.5 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none focus:border-blue"
        />
      </div>

      <button
        type="button"
        onClick={onDone}
        className="w-full rounded-2xl bg-blue py-4 text-[15.5px] font-bold text-white"
      >
        {t("done")}
      </button>
    </div>
  );
}
