"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { startOfWeek } from "@/shared/lib/date";
import { RadarChart } from "@/shared/charts/RadarChart";

export function TrendsTab() {
  const t = useTranslations("stats");
  const logging = useTranslations("logging");
  const groups = useTranslations("groups");
  const currentWeekStartTs = startOfWeek().getTime();
  const data = useQuery(api.stats.getWeekTrends, { currentWeekStartTs });

  if (data === undefined) {
    return <div className="h-120 animate-pulse rounded-card bg-surface" />;
  }

  const axes = data.radar.axes.map((label) => ({
    label: groups(label as "Glutes"),
    current: data.radar.current[label] ?? 0,
    previous: data.radar.previous[label] ?? 0,
  }));

  return (
    <div>
      <div className="mb-2.5 text-center text-[13px] text-muted-2">{t("thisVsLast")}</div>
      <RadarChart axes={axes} />

      <div className="mt-6 grid grid-cols-2 gap-3">
        <TrendCard label={t("workouts")} current={data.current.workouts} previous={data.previous.workouts} />
        <TrendCard
          label={logging("duration")}
          current={Math.round(data.current.durationSec / 60)}
          previous={Math.round(data.previous.durationSec / 60)}
          unit=" min"
        />
        <TrendCard
          label={logging("volume")}
          current={Math.round(data.current.volume)}
          previous={Math.round(data.previous.volume)}
          unit=" kg"
        />
        <TrendCard label={logging("sets")} current={data.current.sets} previous={data.previous.sets} />
      </div>
    </div>
  );
}

function TrendCard({
  label,
  current,
  previous,
  unit = "",
}: {
  label: string;
  current: number;
  previous: number;
  unit?: string;
}) {
  const diff = current - previous;
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  const color = diff > 0 ? "text-green" : diff < 0 ? "text-danger" : "text-muted-2";

  return (
    <div className="rounded-card bg-surface p-4">
      <div className="text-[12px] text-muted-2">{label}</div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-ink">
        {current}
        {unit}
      </div>
      <div className={`mt-1 text-[12.5px] font-bold ${color}`}>
        {arrow} {previous}
        {unit}
      </div>
    </div>
  );
}
