"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { BodyMap } from "@/features/exercises/components/BodyMap";
import { MUSCLE_LABEL } from "@/features/exercises/library/library";
import { WeekNav } from "./WeekNav";

export function BodyTab({
  weekStartTs,
  offset,
  onOffsetChange,
}: {
  weekStartTs: number;
  offset: number;
  onOffsetChange: (next: number) => void;
}) {
  const data = useQuery(api.stats.getWeekMuscleLoad, { weekStartTs });
  const t = useTranslations("stats");
  const muscles = useTranslations("muscles");

  return (
    <div>
      <WeekNav weekStartTs={weekStartTs} offset={offset} onOffsetChange={onOffsetChange} />

      {data === undefined ? (
        <div className="h-105 animate-pulse rounded-card bg-surface" />
      ) : (
        <>
          <BodyMap mode="load" load={normalize(data.fine)} />

          <div className="mt-4 flex items-center justify-between text-[11.5px] font-bold uppercase tracking-wide text-muted-2">
            <span>{t("muscle")}</span>
            <span>{t("sets")}</span>
          </div>
          <div className="mt-1 flex flex-col divide-y divide-line">
            <div className="flex items-center justify-between py-2.5 text-[14px] font-bold text-ink">
              <span>{t("total")}</span>
              <span>{data.totalSets}</span>
            </div>
            {Object.keys(MUSCLE_LABEL)
              .map((id) => ({
                id,
                label: muscles(id as "chest"),
                value: Math.round((data.fine[id] ?? 0) * 10) / 10,
              }))
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 text-[14px] text-ink">
                  <span>{m.label}</span>
                  <span className="text-muted-2">{m.value}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function normalize(fine: Record<string, number>): Record<string, number> {
  const maxV = Math.max(1, ...Object.values(fine));
  const load: Record<string, number> = {};
  for (const [id, v] of Object.entries(fine)) load[id] = v / maxV;
  return load;
}
