"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { startOfWeek } from "@/shared/lib/date";
import { RhythmChart } from "./RhythmChart";
import { SessionHistoryList } from "./SessionHistoryList";
import { StrengthPerExerciseChart } from "./StrengthPerExerciseChart";

export function ProgressScreen() {
  const weekSummary = useQuery(api.logging.getThisWeekSummary, {
    weekStartTs: startOfWeek().getTime(),
  });
  const totalSessions = useQuery(api.logging.getTotalSessionsCount);
  const loading = weekSummary === undefined || totalSessions === undefined;
  const t = useTranslations("progress");

  return (
    <div className="pt-2">
      <div className="pt-6.5 pb-4.5 text-[26px] font-extrabold tracking-tight">
        {t("heading")}
      </div>

      {!loading && totalSessions === 0 ? (
        <div className="py-10 text-center text-[14px] text-muted-2">
          <span className="mb-1.5 block text-lg font-bold text-muted">
            {t("noData")}
          </span>
          {t("noDataBody")}
        </div>
      ) : (
        <>
          <div className="mb-6 flex gap-2.5">
            <StatTile label={t("sessionsThisWeek")} value={weekSummary?.count ?? 0} />
            <StatTile label={t("totalSessions")} value={totalSessions ?? 0} />
          </div>

          <RhythmChart />
          <StrengthPerExerciseChart />

          <div className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-muted">
            {t("history")}
          </div>
          <SessionHistoryList />
        </>
      )}
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
