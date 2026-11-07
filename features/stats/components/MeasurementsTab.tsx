"use client";

import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useDateText } from "@/features/i18n/useDateText";
import { LineChart } from "@/shared/charts/LineChart";
import { BmiCard } from "./BmiCard";
import { BodyMeasurementsCard } from "./BodyMeasurementsCard";
import { WeightLogCard } from "./WeightLogCard";

type FieldKey = "weight" | "bust" | "waist" | "hips" | "leftThigh" | "rightThigh";

const FIELDS: { key: FieldKey; label: "weight" | "bust" | "waist" | "hips" | "leftThigh" | "rightThigh"; unit: string }[] = [
  { key: "weight", label: "weight", unit: "kg" },
  { key: "bust", label: "bust", unit: "cm" },
  { key: "waist", label: "waist", unit: "cm" },
  { key: "hips", label: "hips", unit: "cm" },
  { key: "leftThigh", label: "leftThigh", unit: "cm" },
  { key: "rightThigh", label: "rightThigh", unit: "cm" },
];

export function MeasurementsTab() {
  const t = useTranslations("stats");
  const progress = useTranslations("progress");
  const dates = useDateText();
  const entries = useQuery(api.measurements.list);
  const remove = useMutation(api.measurements.remove);
  const [metric, setMetric] = useState<FieldKey>("weight");

  const latestWeight = useMemo(
    () => entries?.find((e) => e.weight !== undefined)?.weight ?? null,
    [entries]
  );

  const metricField = FIELDS.find((f) => f.key === metric)!;
  const chartPoints = (entries ?? [])
    .filter((e) => e[metric] !== undefined)
    .map((e) => ({ ts: e.ts, value: e[metric] as number }))
    .sort((a, b) => a.ts - b.ts);

  return (
    <div>
      {entries === undefined ? (
        <div className="mb-4 h-42 animate-pulse rounded-card bg-surface" />
      ) : (
        <BmiCard latestWeight={latestWeight} />
      )}

      <WeightLogCard entries={entries} />
      <BodyMeasurementsCard entries={entries} />

      <div className="mb-3 flex items-center justify-between">
        <div className="text-[12.5px] font-bold uppercase tracking-wide text-muted">{t("progress")}</div>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as FieldKey)}
          className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-base text-ink outline-none focus:border-blue"
        >
          {FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {t(f.label)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 rounded-card bg-surface p-4">
        {entries === undefined ? (
          <div className="h-37.5 animate-pulse rounded-card bg-surface-2" />
        ) : chartPoints.length < 2 ? (
          <div className="py-3 text-[13px] text-muted-2">
            {t("notEnoughMetric", { metric: t(metricField.label) })}
          </div>
        ) : (
          <LineChart
            points={chartPoints}
            formatValue={(v) => `${Math.round(v * 10) / 10} ${metricField.unit}`}
          />
        )}
      </div>

      {entries !== undefined && entries.length > 0 && (
        <div>
          <div className="mb-2.5 text-[12.5px] font-bold uppercase tracking-wide text-muted">
            {progress("history")}
          </div>
          <div className="flex flex-col divide-y divide-line rounded-card bg-surface">
            {entries.map((e) => (
              <div key={e._id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-ink">{dates.formatDate(e.ts)}</div>
                  <div className="truncate text-[12px] text-muted-2">
                    {FIELDS.filter((f) => e[f.key] !== undefined)
                      .map((f) => `${t(f.label)} ${e[f.key]}${f.unit}`)
                      .join(" · ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove({ id: e._id })}
                  className="px-1.5 text-[19px] leading-none text-muted-2"
                  aria-label={t("deleteEntry")}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
