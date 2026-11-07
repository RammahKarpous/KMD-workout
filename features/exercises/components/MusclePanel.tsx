"use client";

import { useTranslations } from "next-intl";
import { aggregateLoad } from "../library/aggregateLoad";
import type { CustomExerciseInfo } from "../library/exInfo";
import { BodyMap } from "./BodyMap";

type ExerciseLike = {
  name: string;
  cardio: boolean;
  sets: { weight?: string; reps?: string; min?: string; warmup?: boolean }[];
};

/** "Muscles worked" block: heatmap + a sorted effective-sets bar list.
 * Used by routine detail, session detail, workout summary, and exercise
 * detail's aggregation views. */
export function MusclePanel({
  exercises,
  customExercisesByName = {},
}: {
  exercises: ExerciseLike[];
  customExercisesByName?: Record<string, CustomExerciseInfo>;
}) {
  const t = useTranslations("exercises");
  const muscles = useTranslations("muscles");
  const eff = aggregateLoad(exercises, customExercisesByName);
  const ids = Object.keys(eff);

  if (ids.length === 0) {
    return (
      <div className="px-0.5 py-2 text-[13px] text-muted-2">
        {t("noMuscleGroup")}
      </div>
    );
  }

  const maxv = Math.max(...ids.map((id) => eff[id]));
  const load: Record<string, number> = {};
  ids.forEach((id) => {
    load[id] = eff[id] / maxv;
  });
  const sorted = [...ids].sort((a, b) => eff[b] - eff[a]);

  return (
    <div>
      <BodyMap mode="load" load={load} />
      <div className="mt-4 mb-2.5 flex justify-between px-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-2">
        <span>{t("muscle")}</span>
        <span>{t("effectiveSets")}</span>
      </div>
      <div>
        {sorted.map((id) => {
          const pct = Math.round((eff[id] / maxv) * 100);
          return (
            <div key={id} className="mb-2.5 flex items-center gap-2.75">
              <span className="w-22.5 flex-shrink-0 text-[13px] text-ink">
                {muscles(id as "chest")}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-blue" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8.5 text-right text-[12.5px] font-bold text-muted">
                {Math.round(eff[id] * 10) / 10}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
