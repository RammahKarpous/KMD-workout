"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { LineChart } from "@/shared/charts/LineChart";
import { Chip } from "@/shared/ui/Chip";

type Metric = "volume" | "reps" | "duration";

const METRICS: { id: Metric; label: "volume" | "reps" | "duration" }[] = [
  { id: "volume", label: "volume" },
  { id: "reps", label: "reps" },
  { id: "duration", label: "duration" },
];

type TargetSets = {
  cardio: boolean;
  sets: { weight?: string; reps?: string; warmup?: boolean }[];
}[];

function totalVolume(exercises: TargetSets) {
  let v = 0;
  for (const ex of exercises) {
    if (ex.cardio) continue;
    for (const s of ex.sets) {
      if (s.warmup) continue;
      const reps = Number(s.reps) || 0;
      const weight = Number(s.weight) || 0;
      if (reps > 0) v += weight * reps;
    }
  }
  return v;
}

function totalReps(exercises: TargetSets) {
  let r = 0;
  for (const ex of exercises) {
    if (ex.cardio) continue;
    for (const s of ex.sets) {
      if (s.warmup) continue;
      const reps = Number(s.reps) || 0;
      if (reps > 0) r += reps;
    }
  }
  return r;
}

function formatValue(metric: Metric, v: number) {
  const rounded = Math.round(v * 10) / 10;
  if (metric === "volume") return `${rounded} kg`;
  if (metric === "duration") return `${rounded} min`;
  return `${rounded}`;
}

function valueOf(metric: Metric, session: Doc<"sessions">) {
  if (metric === "duration") return session.durationSec / 60;
  const exercises = session.exercises ?? [];
  return metric === "reps" ? totalReps(exercises) : totalVolume(exercises);
}

/** Routine detail's "at a glance" trend: metric switcher + headline stat +
 * line chart across this routine's logged sessions (or the routine's own
 * target sets as a "planned" headline if it's never been logged yet). */
export function RoutineTrendChart({ routine }: { routine: Doc<"routines"> }) {
  const t = useTranslations("workout");
  const logging = useTranslations("logging");
  const sets = useTranslations("sets");
  const [metric, setMetric] = useState<Metric>("volume");
  const sessions = useQuery(api.logging.getRoutineSessions, {
    routineId: routine._id,
  });

  if (sessions === undefined) {
    return <div className="mb-6 h-37.5 animate-pulse rounded-card bg-surface" />;
  }

  // Query returns newest-first; the chart reads left-to-right chronologically.
  const chronological = [...sessions].reverse();
  const points = chronological.map((s) => ({ ts: s.ts, value: valueOf(metric, s) }));

  const headline =
    sessions.length > 0
      ? formatValue(metric, points[points.length - 1].value)
      : metric === "duration"
        ? "–"
        : t("planned", {
            value: formatValue(metric, metric === "reps" ? totalReps(routine.exercises) : totalVolume(routine.exercises)),
          });

  return (
    <div className="mb-6">
      <div className="mb-3 flex gap-2">
        {METRICS.map((m) => (
          <Chip key={m.id} small active={metric === m.id} onClick={() => setMetric(m.id)}>
            {m.label === "reps" ? sets("reps") : logging(m.label)}
          </Chip>
        ))}
      </div>
      <div className="mb-1 text-[22px] font-extrabold tracking-tight">{headline}</div>
      {sessions.length >= 2 ? (
        <LineChart points={points} formatValue={(v) => formatValue(metric, v)} />
      ) : sessions.length === 1 ? (
        <div className="py-3 text-[13px] text-muted-2">{t("doItAgain")}</div>
      ) : null}
    </div>
  );
}
