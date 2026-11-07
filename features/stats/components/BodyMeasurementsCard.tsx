"use client";

import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { parseDateInputValue, toDateInputValue } from "@/shared/lib/date";

type FieldKey = "bust" | "waist" | "hips" | "leftThigh" | "rightThigh";

const FIELDS: { key: FieldKey; label: "bust" | "waist" | "hips" | "leftThigh" | "rightThigh" }[] = [
  { key: "bust", label: "bust" },
  { key: "waist", label: "waist" },
  { key: "hips", label: "hips" },
  { key: "leftThigh", label: "leftThigh" },
  { key: "rightThigh", label: "rightThigh" },
];

const EMPTY_VALUES: Record<FieldKey, string> = {
  bust: "",
  waist: "",
  hips: "",
  leftThigh: "",
  rightThigh: "",
};

/** Body-shape measurements, in their own card (with their own date) since
 * these are typically logged much less often than weight. */
export function BodyMeasurementsCard({
  entries,
}: {
  entries: Doc<"measurements">[] | undefined;
}) {
  const upsert = useMutation(api.measurements.upsert);
  const t = useTranslations("stats");

  const [date, setDate] = useState(() => toDateInputValue());
  const [values, setValues] = useState<Record<FieldKey, string>>(EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);

  const ts = parseDateInputValue(date);
  const existing = entries?.find((e) => e.ts === ts) ?? null;

  useEffect(() => {
    setValues({
      bust: existing?.bust?.toString() ?? "",
      waist: existing?.waist?.toString() ?? "",
      hips: existing?.hips?.toString() ?? "",
      leftThigh: existing?.leftThigh?.toString() ?? "",
      rightThigh: existing?.rightThigh?.toString() ?? "",
    });
  }, [existing]);

  const hasExisting = FIELDS.some((f) => existing?.[f.key] !== undefined);

  async function save() {
    setError(null);
    const patch: Partial<Record<FieldKey, number>> = {};
    for (const f of FIELDS) {
      const raw = values[f.key].trim();
      if (raw === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n)) patch[f.key] = n;
    }
    if (Object.keys(patch).length === 0) {
      setError(t("fillOne"));
      return;
    }
    await upsert({ ts, ...patch });
  }

  return (
    <div className="mb-4 rounded-card bg-surface p-4">
      <div className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-muted">
        {t("bodyMeasurements")}
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">{t("date")}</label>
      <input
        type="date"
        value={date}
        max={toDateInputValue()}
        onChange={(e) => setDate(e.target.value)}
        className="mb-3.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-base text-ink outline-none focus:border-blue"
      />

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">
              {t(f.label)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="w-full min-w-0 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-base text-ink outline-none focus:border-blue"
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      <button
        type="button"
        onClick={save}
        className="mt-4 w-full rounded-2xl bg-surface-2 py-3.5 text-[15.5px] font-bold text-blue"
      >
        {hasExisting ? t("updateMeasurements") : t("saveMeasurements")}
      </button>
    </div>
  );
}
