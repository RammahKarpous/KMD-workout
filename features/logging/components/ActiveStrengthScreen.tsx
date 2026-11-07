"use client";

import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExerciseDetailTabs } from "@/features/exercises/components/ExerciseDetailTabs";
import { ExercisePickerSheet } from "@/features/exercises/components/ExercisePickerSheet";
import { MusclePanel } from "@/features/exercises/components/MusclePanel";
import { useExerciseHistory } from "@/features/exercises/hooks/useExerciseHistory";
import { formatDuration } from "@/shared/lib/date";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { ChevronDownIcon } from "@/shared/ui/icons";
import { SetBlock, type DraftExercise, type DraftSet } from "@/shared/ui/SetBlock";
import { SheetHeader } from "@/shared/ui/SheetHeader";
import { useSheet } from "@/shared/ui/SheetHost";
import { useActiveWorkout } from "../context/ActiveWorkoutContext";
import { ElapsedTimer } from "./ElapsedTimer";
import { WorkoutSummaryScreen } from "./WorkoutSummaryScreen";

function hasValue(s: DraftSet): boolean {
  return Boolean(s.reps || s.weight || s.min);
}

/** A checked-off set (so it's meant to be done) that's still missing its
 * weight or rep count — a checked box with half-typed data is more likely a
 * stray tap than an intentional bodyweight/no-load set, so this is flagged
 * regardless of how many other sets are checked. Cardio sets have no
 * weight/reps concept, and warm-ups aren't always logged with exact
 * numbers, so neither is held to this. */
function hasIncompleteData(ex: DraftExercise, s: DraftSet): boolean {
  return hasValue(s) && Boolean(s.done) && !ex.cardio && !s.warmup && (!s.reps || !s.weight);
}

export function ActiveStrengthScreen({
  initialExercises,
  routineId,
  routineName,
  startTs,
}: {
  initialExercises: DraftExercise[];
  routineId?: Id<"routines">;
  routineName?: string;
  /** Generated once by the caller when it starts this workout via
   * `useActiveWorkout().start()`, so the mini-bar's timer and this screen's
   * timer read from the same source instead of drifting apart. */
  startTs: number;
}) {
  const { push, pop } = useSheet();
  const t = useTranslations("logging");
  const { minimize, end } = useActiveWorkout();
  const finishStrengthSession = useMutation(api.logging.finishStrengthSession);
  const updateSessionNotes = useMutation(api.logging.updateSessionNotes);
  const customExercises = useQuery(api.exercises.listCustomExercises) ?? [];

  const [exercises, setExercises] = useState<DraftExercise[]>(initialExercises);
  const [phase, setPhase] = useState<"log" | "summary">("log");
  const [notes, setNotes] = useState("");
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // Snapshotted once at "Finish" so the summary's displayed duration and the
  // saved duration always match, instead of drifting if the user lingers.
  const [finishedDurationSec, setFinishedDurationSec] = useState(0);

  function updateExercise(i: number, next: DraftExercise) {
    setExercises((exs) => exs.map((ex, idx) => (idx === i ? next : ex)));
  }
  function removeExercise(i: number) {
    setExercises((exs) => exs.filter((_, idx) => idx !== i));
  }
  function openPicker() {
    push(
      "exercise-picker",
      <ExercisePickerSheet
        onPick={({ name, cardio }) => {
          const sets: DraftSet[] = cardio
            ? [{ min: "", done: false }]
            : [{ weight: "", reps: "", done: false }];
          setExercises((exs) => [...exs, { name, cardio, sets }]);
        }}
      />
    );
  }

  async function proceedFinish(current: DraftExercise[]) {
    const cleaned = current
      .map((ex) => ({ ...ex, sets: ex.sets.filter(hasValue) }))
      .filter((ex) => ex.sets.length > 0);
    if (cleaned.length === 0) {
      end();
      return;
    }
    const durationSec = (Date.now() - startTs) / 1000;
    setFinishing(true);
    const id = await finishStrengthSession({
      routineId,
      routineName,
      exercises: cleaned,
      durationSec,
      ts: startTs,
    });
    setExercises(cleaned);
    setFinishedDurationSec(durationSec);
    setSessionId(id);
    setFinishing(false);
    setPhase("summary");
  }

  function handleFinish() {
    if (finishing) return;
    // Warn whenever any set across the whole workout is left unchecked, so a
    // routine can't be finished with sets silently skipped.
    const realSets = exercises.flatMap((ex) => ex.sets.filter(hasValue).map((s) => ({ ex, s })));
    const anyUnchecked = realSets.some(({ s }) => !s.done);
    const anyIncompleteData = realSets.some(({ ex, s }) => hasIncompleteData(ex, s));
    const incomplete = anyUnchecked || anyIncompleteData;
    if (incomplete) {
      setConfirmFinish(true);
      return;
    }
    proceedFinish(exercises);
  }

  function commitNotes() {
    if (sessionId) updateSessionNotes({ id: sessionId, notes });
  }

  if (phase === "summary") {
    let volume = 0;
    let setCount = 0;
    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.warmup) return;
        if (ex.cardio) {
          if ((Number(s.min) || 0) > 0) setCount++;
        } else {
          const reps = Number(s.reps) || 0;
          const w = Number(s.weight) || 0;
          if (reps > 0) {
            setCount++;
            volume += w * reps;
          }
        }
      });
    });
    const customByName = Object.fromEntries(
      customExercises.map((c) => [c.name, { primaryMuscle: c.primaryMuscle }])
    );
    const hasMuscleData = exercises.some((ex) => !ex.cardio);

    return (
      <WorkoutSummaryScreen
        title={routineName ?? t("defaultTitle")}
        stats={[
          { label: t("duration"), value: formatDuration(finishedDurationSec), accent: true },
          { label: t("volume"), value: t("volumeKg", { amount: Math.round(volume * 10) / 10 }) },
          { label: t("sets"), value: `${setCount}` },
        ]}
        muscleSection={
          hasMuscleData ? (
            <MusclePanel exercises={exercises} customExercisesByName={customByName} />
          ) : undefined
        }
        notes={notes}
        onNotesChange={setNotes}
        onNotesBlur={commitNotes}
        onDone={end}
      />
    );
  }

  return (
    <div className="p-4">
      <SheetHeader
        title={routineName ?? t("defaultTitle")}
        onClose={end}
        right={
          <>
            <button
              type="button"
              onClick={minimize}
              aria-label={t("minimize")}
              className="flex items-center justify-center p-1.5 text-ink"
            >
              <ChevronDownIcon />
            </button>
            <button
              type="button"
              onClick={handleFinish}
              disabled={finishing}
              className="text-[15px] font-bold text-blue disabled:opacity-50"
            >
              {t("finish")}
            </button>
          </>
        }
      />
      <ElapsedTimer startTs={startTs} />

      {exercises.length === 0 && (
        <div className="py-8 text-center text-[14px] text-muted-2">
          <span className="mb-1.5 block text-lg font-bold text-muted">
            {t("noExercises")}
          </span>
          {t("addOne")}
        </div>
      )}

      {exercises.map((ex, i) => (
        <LoggingSetBlock
          key={i}
          exercise={ex}
          onChange={(next) => updateExercise(i, next)}
          onRemove={() => removeExercise(i)}
          onOpenDetail={() =>
            push("exercise-detail", <ExerciseDetailTabs name={ex.name} onBack={pop} />)
          }
        />
      ))}

      <button
        type="button"
        onClick={openPicker}
        className="w-full rounded-2xl bg-surface py-4 text-[15.5px] font-bold text-blue"
      >
        {t("addExercise")}
      </button>

      <ConfirmDialog
        open={confirmFinish}
        message={t("finishAnyway")}
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => {
          setConfirmFinish(false);
          proceedFinish(exercises);
        }}
      />
    </div>
  );
}

/** Wraps SetBlock with its own bounded exercise-history subscription, so
 * "last time" data loads per exercise without breaking rules-of-hooks when
 * exercises are added/removed from the list above. */
function LoggingSetBlock({
  exercise,
  onChange,
  onRemove,
  onOpenDetail,
}: {
  exercise: DraftExercise;
  onChange: (next: DraftExercise) => void;
  onRemove: () => void;
  onOpenDetail: () => void;
}) {
  const history = useExerciseHistory(exercise.name);
  const previousSets = exercise.cardio
    ? undefined
    : history === undefined
      ? undefined
      : (history.matches[0]?.sets ?? null);

  return (
    <SetBlock
      exercise={exercise}
      mode="log"
      previousSets={previousSets}
      onChange={onChange}
      onRemove={onRemove}
      onOpenDetail={onOpenDetail}
    />
  );
}
