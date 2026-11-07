"use client";

import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { ExerciseDetailTabs } from "@/features/exercises/components/ExerciseDetailTabs";
import { ExercisePickerSheet } from "@/features/exercises/components/ExercisePickerSheet";
import { AlertDialog } from "@/shared/ui/AlertDialog";
import { SheetHeader } from "@/shared/ui/SheetHeader";
import { useSheet } from "@/shared/ui/SheetHost";
import { SetBlock, type DraftExercise } from "@/shared/ui/SetBlock";

type RoutineDraft = {
  id?: Id<"routines">;
  name: string;
  folderName: string;
  exercises: DraftExercise[];
};

export function RoutineEditorSheet({
  existing,
}: {
  existing?: Doc<"routines"> | null;
}) {
  const { push, pop } = useSheet();
  const data = useQuery(api.workout.listFoldersAndRoutines);
  const createRoutine = useMutation(api.workout.createRoutine);
  const updateRoutine = useMutation(api.workout.updateRoutine);
  const t = useTranslations("workout");

  const [draft, setDraft] = useState<RoutineDraft>(() => ({
    id: existing?._id,
    name: existing?.name ?? "",
    folderName: "",
    exercises: existing
      ? existing.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => ({ ...s })),
        }))
      : [],
  }));
  const [alert, setAlert] = useState<string | null>(null);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const folderMatches = (data?.folders ?? []).filter((f) =>
    f.name.toLowerCase().includes(draft.folderName.trim().toLowerCase())
  );

  // The routine's folder is stored as an id; resolve it to a name for the
  // free-text combobox once the folders list has loaded.
  useEffect(() => {
    if (!existing?.folderId || !data) return;
    const folder = data.folders.find((f) => f._id === existing.folderId);
    if (folder) setDraft((d) => ({ ...d, folderName: folder.name }));
  }, [existing?.folderId, data]);

  function updateExercise(index: number, next: DraftExercise) {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex, i) => (i === index ? next : ex)),
    }));
  }
  function removeExercise(index: number) {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.filter((_, i) => i !== index),
    }));
  }
  // --- drag to reorder ---
  // A from-scratch pointer-driven reorder (no dnd library in this project):
  // press the grip handle to pick up a row, which collapses it to just its
  // header; each pointermove measures where the row's center now sits
  // relative to its siblings' current rects and, if it has crossed into a
  // neighbor's slot, splices it into that position live; releasing the
  // pointer just lets go — the array is already in its final order.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragInfoRef = useRef<{ index: number; startY: number } | null>(null);
  const exercisesRef = useRef(draft.exercises);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    exercisesRef.current = draft.exercises;
  }, [draft.exercises]);

  // Stable listener pair so add/removeEventListener always target the same
  // function identities. Built once in an effect (not during render, and
  // not via useCallback — each closes over the other for cleanup, which
  // needs both to exist before either is referenced).
  const dragListeners = useRef<{ move: (e: PointerEvent) => void; up: () => void } | null>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const info = dragInfoRef.current;
      if (!info) return;
      setDragOffsetY(e.clientY - info.startY);

      const draggedEl = rowRefs.current[info.index];
      if (!draggedEl) return;
      const draggedRect = draggedEl.getBoundingClientRect();
      const draggedCenter = draggedRect.top + draggedRect.height / 2;

      const exercises = exercisesRef.current;
      let targetIndex = 0;
      for (let j = 0; j < exercises.length; j++) {
        if (j === info.index) continue;
        const el = rowRefs.current[j];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top + rect.height / 2 < draggedCenter) targetIndex++;
      }
      if (targetIndex === info.index) return;

      const next = [...exercises];
      const [moved] = next.splice(info.index, 1);
      next.splice(targetIndex, 0, moved);
      exercisesRef.current = next;
      dragInfoRef.current = { index: targetIndex, startY: e.clientY };
      setDragIndex(targetIndex);
      setDragOffsetY(0);
      setDraft((d) => ({ ...d, exercises: next }));
    };
    const up = () => {
      dragInfoRef.current = null;
      setDragIndex(null);
      setDragOffsetY(0);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    dragListeners.current = { move, up };
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  function handleDragHandlePointerDown(e: React.PointerEvent, index: number) {
    if (dragInfoRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    dragInfoRef.current = { index, startY: e.clientY };
    setDragIndex(index);
    setDragOffsetY(0);
    window.addEventListener("pointermove", dragListeners.current!.move);
    window.addEventListener("pointerup", dragListeners.current!.up);
  }

  function openPicker() {
    push(
      "exercise-picker",
      <ExercisePickerSheet
        onPick={({ name, cardio }) => {
          const sets = cardio
            ? [{ min: "" }]
            : [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }];
          setDraft((d) => ({
            ...d,
            exercises: [...d.exercises, { name, cardio, sets }],
          }));
        }}
      />
    );
  }

  async function save() {
    if (!draft.name.trim()) {
      setAlert(t("routineNameRequired"));
      return;
    }
    if (draft.exercises.length === 0) {
      setAlert(t("exerciseRequired"));
      return;
    }
    if (draft.id) {
      await updateRoutine({
        id: draft.id,
        name: draft.name,
        folderName: draft.folderName,
        exercises: draft.exercises,
      });
    } else {
      await createRoutine({
        name: draft.name,
        folderName: draft.folderName,
        exercises: draft.exercises,
      });
    }
    pop();
  }

  return (
    <div className="p-4">
      <SheetHeader title={draft.id ? t("routineTitle") : t("newRoutineTitle")} onClose={pop} />

      <div className="mb-4">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">
          {t("routineName")}
        </label>
        <input
          placeholder={t("routinePlaceholder")}
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none focus:border-blue"
        />
      </div>

      <div className="relative mb-4">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">
          {t("folderOptional")}
        </label>
        <input
          placeholder={t("folderHint")}
          value={draft.folderName}
          onChange={(e) => setDraft((d) => ({ ...d, folderName: e.target.value }))}
          onFocus={() => setFolderMenuOpen(true)}
          onBlur={() => setTimeout(() => setFolderMenuOpen(false), 150)}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none focus:border-blue"
        />
        {folderMenuOpen && folderMatches.length > 0 && (
          <div className="absolute z-10 mt-1.5 max-h-48 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
            {folderMatches.map((f) => (
              <button
                key={f._id}
                type="button"
                onClick={() => {
                  setDraft((d) => ({ ...d, folderName: f.name }));
                  setFolderMenuOpen(false);
                }}
                className="block w-full px-3.5 py-2.5 text-left text-[14px] text-ink hover:bg-surface-2"
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {draft.exercises.length === 0 && (
        <div className="py-8 text-center text-[14px] text-muted-2">
          <span className="mb-1.5 block text-lg font-bold text-muted">
            {t("noExercisesYet")}
          </span>
          {t("addExerciseHint")}
        </div>
      )}

      {draft.exercises.map((ex, i) => (
        <SetBlock
          key={i}
          ref={(el) => {
            rowRefs.current[i] = el;
          }}
          exercise={ex}
          mode="routine"
          position={{ index: i }}
          onChange={(next) => updateExercise(i, next)}
          onRemove={() => removeExercise(i)}
          onOpenDetail={() =>
            push("exercise-detail", <ExerciseDetailTabs name={ex.name} onBack={pop} />)
          }
          onDragHandlePointerDown={(e) => handleDragHandlePointerDown(e, i)}
          collapsed={dragIndex !== null}
          dragging={dragIndex === i}
          dragOffsetY={dragIndex === i ? dragOffsetY : undefined}
        />
      ))}

      <button
        type="button"
        onClick={openPicker}
        className="w-full rounded-2xl bg-surface py-4 text-[15.5px] font-bold text-blue"
      >
        {t("addExercise")}
      </button>

      <button
        type="button"
        onClick={save}
        className="mt-4 w-full rounded-2xl bg-blue py-4 text-[15.5px] font-bold text-white"
      >
        {t("saveRoutine")}
      </button>

      <AlertDialog
        open={alert !== null}
        message={alert ?? ""}
        onClose={() => setAlert(null)}
      />
    </div>
  );
}
