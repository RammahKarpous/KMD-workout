"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { startOfWeek } from "@/shared/lib/date";
import { BarChart } from "@/shared/charts/BarChart";

function weekLabel(weekStartTs: number) {
  const d = new Date(weekStartTs);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function RhythmChart() {
  const t = useTranslations("progress");
  const currentWeekStartTs = startOfWeek().getTime();
  const weeks = useQuery(api.progress.weeklyRhythm, { currentWeekStartTs });

  return (
    <div className="mb-6">
      <div className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-muted">
        {t("rhythm")}
      </div>
      {weeks === undefined ? (
        <div className="h-44.25 animate-pulse rounded-card bg-surface" />
      ) : (
        <div className="rounded-card bg-surface p-4">
          <BarChart
            points={weeks.map((w, i) => ({
              label: weekLabel(w.weekStartTs),
              value: w.count,
              highlighted: i === weeks.length - 1,
            }))}
          />
        </div>
      )}
    </div>
  );
}
