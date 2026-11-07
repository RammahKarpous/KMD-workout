"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_TARGETS, GROUP_ORDER } from "@/features/exercises/library/library";
import { TargetEditDialog } from "./TargetEditDialog";
import { WeekNav } from "./WeekNav";

export function SetsTab({
  weekStartTs,
  offset,
  onOffsetChange,
}: {
  weekStartTs: number;
  offset: number;
  onOffsetChange: (next: number) => void;
}) {
  const data = useQuery(api.stats.getWeekSets, { weekStartTs });
  const targets = useQuery(api.stats.getTargets);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const t = useTranslations("stats");
  const groups = useTranslations("groups");
  const loading = data === undefined || targets === undefined;

  return (
    <div>
      <WeekNav weekStartTs={weekStartTs} offset={offset} onOffsetChange={onOffsetChange} />

      {loading ? (
        <div className="h-105 animate-pulse rounded-card bg-surface" />
      ) : (
        <>
          <div className="mb-5 flex gap-2.5">
            <StatTile label={t("totalSetsLower")} value={data.totalSets} />
            <StatTile label={t("totalRepsLower")} value={data.totalReps} />
          </div>

          <div className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-muted">
            {t("setsPerMuscle")}
          </div>

          <div className="flex flex-col gap-3">
            {GROUP_ORDER.map((grp) => {
              const sets = Math.round((data.groups[grp] ?? 0) * 10) / 10;
              const reps = Math.round(data.reps[grp] ?? 0);
              const fallback = DEFAULT_TARGETS[grp];
              const target = targets[grp] ?? { min: fallback[0], max: fallback[1] };
              const status = sets < target.min ? "under" : sets > target.max ? "over" : "onTrack";
              const statusColor =
                status === "over"
                  ? "text-danger"
                  : status === "onTrack"
                    ? "text-green"
                    : "text-muted-2";
              const barColor =
                status === "over" ? "bg-danger" : status === "onTrack" ? "bg-green" : "bg-blue";
              const pct = target.max ? Math.min(100, Math.round((sets / target.max) * 100)) : 0;

              return (
                <div key={grp} className="rounded-card bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-bold text-ink">{groups(grp as "Glutes")}</span>
                    <span className={`text-[12px] font-bold ${statusColor}`}>{t(status)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[13px] text-muted-2">
                    <span>{t("setsCount", { count: sets })}</span>
                    <span>
                      {target.min}&ndash;{target.max}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12px] text-muted-2">
                    <span>{t("totalReps")}</span>
                    <span>{reps}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingGroup(grp)}
                    className="mt-3 text-[12.5px] font-bold text-blue"
                  >
                    {t("editTarget")}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {editingGroup &&
        (() => {
          const fallback = DEFAULT_TARGETS[editingGroup];
          const target = targets?.[editingGroup] ?? { min: fallback[0], max: fallback[1] };
          return (
            <TargetEditDialog
              group={editingGroup}
              initialMin={target.min}
              initialMax={target.max}
              onClose={() => setEditingGroup(null)}
            />
          );
        })()}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-card bg-surface p-4">
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-1 text-[12px] text-muted-2">{label}</div>
    </div>
  );
}
