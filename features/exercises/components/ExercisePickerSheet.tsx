"use client";

/**
 * Lives in features/exercises (not shared/ui) even though both the routine
 * editor and live logging use it, because it inherently owns exercise
 * search/library/custom-exercise-creation — features/exercises is treated
 * as the canonical owner of "what is an exercise," the one deliberate
 * exception to "no cross-feature imports" between sibling features.
 */

import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { SheetHeader } from "@/shared/ui/SheetHeader";
import { useSheet } from "@/shared/ui/SheetHost";
import { CARDIO, LIBRARY, MUSCLE_GROUPS } from "../library/library";
import { ExerciseThumb } from "./ExerciseThumb";

export function ExercisePickerSheet({
  onPick,
}: {
  onPick: (exercise: { name: string; cardio: boolean }) => void;
}) {
  const { pop } = useSheet();
  const t = useTranslations("exercises");
  const muscles = useTranslations("muscles");
  const groups = useTranslations("libraryGroups");
  const customExercises = useQuery(api.exercises.listCustomExercises) ?? [];
  const createCustomExercise = useMutation(api.exercises.createCustomExercise);

  const [query, setQuery] = useState("");
  const [pendingName, setPendingName] = useState<string | null>(null);

  const customNames = useMemo(
    () => customExercises.map((c) => c.name),
    [customExercises]
  );
  const allNames = useMemo(() => {
    const names: string[] = [];
    for (const group of Object.values(LIBRARY)) {
      for (const n of group) if (!names.includes(n)) names.push(n);
    }
    for (const n of CARDIO) if (!names.includes(n)) names.push(n);
    for (const n of customNames) if (!names.includes(n)) names.push(n);
    return names;
  }, [customNames]);

  function pick(name: string) {
    onPick({ name, cardio: CARDIO.includes(name) });
    pop();
  }

  if (pendingName !== null) {
    return (
      <div className="p-4">
        <SheetHeader
          title={t("muscleGroup")}
          onClose={() => setPendingName(null)}
          closeIcon="back"
        />
        <p className="mb-4 px-0.5 text-sm leading-snug text-muted">
          {t("customMusclePrompt", { name: pendingName })}
        </p>
        <div className="mb-4">
          {MUSCLE_GROUPS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={async () => {
                await createCustomExercise({
                  name: pendingName,
                  primaryMuscle: m.id,
                });
                pick(pendingName);
              }}
              className="mb-2 w-full rounded-xl border border-line bg-surface px-3.25 py-2.5 text-left text-[15px] font-medium text-ink"
            >
              {muscles(m.id as "chest")}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = q
    ? allNames
        .filter((n) => n.toLowerCase().includes(q))
        .sort(
          (a, b) => a.toLowerCase().indexOf(q) - b.toLowerCase().indexOf(q)
        )
    : [];
  const exactMatch = q ? allNames.some((n) => n.toLowerCase() === q) : true;

  return (
    <div className="p-4">
      <SheetHeader title={t("add")} onClose={pop} />
      <input
        autoFocus
        placeholder={t("search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3.5 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none focus:border-blue"
      />

      {q === "" ? (
        <div>
          {Object.entries(LIBRARY).map(([group, names]) => (
            <PickerGroup key={group} label={groups(group as "Chest")} names={names} onPick={pick} />
          ))}
          <PickerGroup label={groups("Cardio")} names={CARDIO} onPick={pick} />
          {customNames.length > 0 && (
            <PickerGroup label={groups("Custom")} names={customNames} custom onPick={pick} />
          )}
        </div>
      ) : (
        <div>
          {matches.map((n) => (
            <PickerItem
              key={n}
              name={n}
              custom={customNames.includes(n)}
              onClick={() => pick(n)}
            />
          ))}
          {!exactMatch && (
            <button
              type="button"
              onClick={() => setPendingName(query.trim())}
              className="mb-2 w-full rounded-xl border border-line bg-surface px-3.25 py-2.5 text-left"
            >
              <span className="text-[13.5px] font-bold text-blue">
                {t("addNamed", { name: query.trim() })}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PickerGroup({
  label,
  names,
  custom,
  onPick,
}: {
  label: string;
  names: string[];
  custom?: boolean;
  onPick: (n: string) => void;
}) {
  return (
    <div className="mb-4.5">
      <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-blue">
        {label}
      </div>
      {names.map((n) => (
        <PickerItem key={n} name={n} custom={custom} onClick={() => onPick(n)} />
      ))}
    </div>
  );
}

function PickerItem({
  name,
  custom,
  onClick,
}: {
  name: string;
  custom?: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("exercises");
  const cardio = useTranslations("cardio");
  const label = (CARDIO as readonly string[]).includes(name) ? cardio(name as "Walking") : name;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.25 py-2.5 text-left hover:bg-surface-2"
    >
      <ExerciseThumb name={name} />
      <span className="min-w-0 flex-1 text-[15px] font-medium text-ink">
        {label}
      </span>
      {custom && (
        <span className="rounded-md bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold text-muted">
          {t("custom")}
        </span>
      )}
    </button>
  );
}
