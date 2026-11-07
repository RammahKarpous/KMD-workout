"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { CARDIO } from "@/features/exercises/library/library";
import { LineChart } from "@/shared/charts/LineChart";

export function StrengthPerExerciseChart() {
  const t = useTranslations("progress");
  const allNames = useQuery(api.exercises.listAllLoggedExerciseNames);
  const strengthNames = (allNames ?? []).filter((n) => !CARDIO.includes(n));
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (selected === null && strengthNames.length > 0) {
      setSelected(strengthNames[0]);
    }
  }, [selected, strengthNames]);

  if (allNames === undefined) {
    return <div className="mb-6 h-59 animate-pulse rounded-card bg-surface" />;
  }
  if (strengthNames.length === 0) return null;

  const current = selected && strengthNames.includes(selected) ? selected : strengthNames[0];

  return (
    <div className="mb-6">
      <div className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-muted">
        {t("strength")}
      </div>
      <div className="rounded-card bg-surface p-4">
        <select
          value={current}
          onChange={(e) => setSelected(e.target.value)}
          className="mb-3.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-base text-ink outline-none focus:border-blue"
        >
          {strengthNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <ExerciseWeightChart name={current} />
      </div>
    </div>
  );
}

function ExerciseWeightChart({ name }: { name: string }) {
  const t = useTranslations("progress");
  const points = useQuery(api.progress.strengthPerExercise, { name });

  if (points === undefined) {
    return <div className="h-37.5 animate-pulse rounded-card bg-surface-2" />;
  }
  if (points.length < 2) {
    return (
      <div className="py-3 text-[13px] text-muted-2">
        {t("notEnough")}
      </div>
    );
  }

  return (
    <>
      <LineChart
        points={points.map((p) => ({ ts: p.ts, value: p.weight }))}
        formatValue={(v) => `${Math.round(v * 10) / 10} kg`}
      />
      <div className="mt-1.5 text-[11.5px] text-muted-2">{t("bestWeight")}</div>
    </>
  );
}
