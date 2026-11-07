"use client";

import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { forwardRef } from "react";
import { ExerciseThumb } from "@/features/exercises/components/ExerciseThumb";
import { CheckIcon, ClockIcon } from "./icons";
import { SwipeToDelete } from "./SwipeToDelete";

export type DraftSet = {
  weight?: string;
  reps?: string;
  min?: string;
  done?: boolean;
  warmup?: boolean;
};
export type DraftExercise = {
  name: string;
  cardio: boolean;
  sets: DraftSet[];
  notes?: string;
};

/**
 * Shared set-editing block: per-exercise thumbnail/name/remove header, an
 * optional notes field, a grid of set rows (weight+reps, or minutes for
 * cardio) each swipeable-left to delete, a done-toggle per row, and "+ Set".
 * Used unmodified by both the routine editor ("routine" mode: target sets,
 * no "last time" reference or notes) and live logging ("log" mode: actual
 * sets, "last time" reference from the most recent past session with this
 * exercise, and a per-exercise note). Pure prop-driven — no data fetching —
 * so it has no feature of its own and lives in shared/ui.
 */
export const SetBlock = forwardRef<
  HTMLDivElement,
  {
    exercise: DraftExercise;
    mode: "routine" | "log";
    /** Most recent completed sets for this exercise, for the "last time"
     * reference line and input placeholders. `null` = checked, no history
     * yet. `undefined` = not applicable (e.g. routine editor). */
    previousSets?: DraftSet[] | null;
    /** This exercise's 1-based position among its siblings — shown as a
     * small number badge. Only meaningful where exercises have a stable,
     * user-visible order (the routine editor); omitted elsewhere. */
    position?: { index: number };
    onChange: (next: DraftExercise) => void;
    onRemove: () => void;
    onOpenDetail?: () => void;
    /** Press-and-hold the grip handle to start dragging this row to
     * reorder it. Presence of this prop is what shows the handle. */
    onDragHandlePointerDown?: (e: React.PointerEvent) => void;
    /** True for every row while a reorder is in progress anywhere in the
     * list — collapses each row to just its header so all rows share a
     * uniform height, which keeps the drag math (and the dragged row's
     * position under the pointer) exact regardless of how many sets each
     * exercise has. */
    collapsed?: boolean;
    /** True while this row is the one currently being dragged — lifts it
     * above its siblings and applies the drag transform. */
    dragging?: boolean;
    /** Pixel offset applied via transform while dragging, so the row
     * visually follows the pointer. */
    dragOffsetY?: number;
  }
>(function SetBlock(
  {
    exercise,
    mode,
    previousSets,
    position,
    onChange,
    onRemove,
    onOpenDetail,
    onDragHandlePointerDown,
    collapsed,
    dragging,
    dragOffsetY,
  },
  ref
) {
  const t = useTranslations("sets");
  const logging = useTranslations("logging");
  function updateSet(i: number, patch: Partial<DraftSet>) {
    const sets = exercise.sets.map((s, idx) =>
      idx === i ? { ...s, ...patch } : s
    );
    onChange({ ...exercise, sets });
  }
  function removeSet(i: number) {
    onChange({ ...exercise, sets: exercise.sets.filter((_, idx) => idx !== i) });
  }
  function addSet() {
    const blank: DraftSet = exercise.cardio
      ? { min: "", ...(mode === "log" ? { done: false } : {}) }
      : { weight: "", reps: "", ...(mode === "log" ? { done: false } : {}) };
    onChange({ ...exercise, sets: [...exercise.sets, blank] });
  }
  function toggleDone(i: number) {
    updateSet(i, { done: !exercise.sets[i].done });
  }
  function toggleWarmup(i: number) {
    updateSet(i, { warmup: !exercise.sets[i].warmup });
  }

  const checkButtonClass = (done?: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-[9px] border-[1.6px] ${
      done ? "border-green bg-green text-[#04310F]" : "border-line text-muted-2"
    }`;

  // Working sets are numbered on their own — warm-ups don't take a number,
  // so the first real set always starts at 1 regardless of how many
  // warm-ups come before it.
  let workingCount = 0;
  const workingSetNumber = exercise.sets.map((s) => (s.warmup ? null : ++workingCount));

  // A "Previous" column (this session's set N vs. the same slot last time)
  // only makes sense once there's history to show — live logging and
  // editing a past session, not the routine editor's target sets.
  const showPrevious = mode === "log" && !exercise.cardio && previousSets !== undefined;
  const setCols = showPrevious ? "grid-cols-[24px_1fr_1fr_1fr_32px]" : "grid-cols-[24px_1fr_1fr_32px]";

  return (
    <div
      ref={ref}
      style={
        dragging
          ? { transform: `translateY(${dragOffsetY ?? 0}px)`, position: "relative", zIndex: 30 }
          : undefined
      }
      className={`mb-3 rounded-card bg-surface p-4 ${dragging ? "shadow-lg" : ""}`}
    >
      <div className="mb-2 flex items-center gap-3">
        {onDragHandlePointerDown && (
          <button
            type="button"
            onPointerDown={onDragHandlePointerDown}
            aria-label={t("reorder", { name: exercise.name })}
            className="touch-none p-1 text-muted-2 active:cursor-grabbing"
          >
            <GripVertical className="h-4.5 w-4.5" strokeWidth={2} />
          </button>
        )}
        {position && (
          <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-muted-2">
            {position.index + 1}
          </span>
        )}
        <button
          type="button"
          onClick={onOpenDetail}
          disabled={!onOpenDetail}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ExerciseThumb name={exercise.name} />
          <span className="truncate text-[15.5px] font-bold tracking-tight">
            {exercise.name}
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="px-1.5 text-[19px] leading-none text-muted-2"
          aria-label={t("remove", { name: exercise.name })}
        >
          &times;
        </button>
      </div>

      {!collapsed && mode === "log" && (
        <textarea
          rows={1}
          placeholder={t("notesPlaceholder")}
          value={exercise.notes ?? ""}
          onChange={(e) => onChange({ ...exercise, notes: e.target.value })}
          className="mb-2.5 w-full resize-none bg-transparent text-base text-muted outline-none placeholder:text-muted-2"
        />
      )}

      {!collapsed && (exercise.cardio ? (
        <>
          <div className="mb-1.5 grid grid-cols-[24px_1fr_32px] gap-2 px-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-2">
            <span className="text-center">{t("set")}</span>
            <span className="text-center">{t("minutes")}</span>
            <span />
          </div>
          {exercise.sets.map((s, i) => (
            <SwipeToDelete key={i} onDelete={() => removeSet(i)} className="mb-1.5 rounded-lg">
              <div
                className={`grid grid-cols-[24px_1fr_32px] items-center gap-2 rounded-lg px-1 py-1 ${
                  s.done ? "bg-green/20" : ""
                }`}
              >
                <div className="text-center text-xs font-bold text-muted-2">
                  {i + 1}
                </div>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder={t("minPlaceholder")}
                  value={s.min ?? ""}
                  onChange={(e) => updateSet(i, { min: e.target.value })}
                  className={`w-full min-w-0 rounded-xl border px-2 py-2.5 text-center text-base outline-none focus:border-blue ${
                    s.done ? "border-green bg-green text-[#04310F]" : "border-surface-2 bg-surface-2 text-ink"
                  }`}
                />
                {mode === "log" ? (
                  <button
                    type="button"
                    onClick={() => toggleDone(i)}
                    className={checkButtonClass(s.done)}
                  >
                    <CheckIcon />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            </SwipeToDelete>
          ))}
          {exercise.name === "StairMaster" && (
            <div className="mt-3 flex gap-3 rounded-card border border-line bg-surface p-4 text-[13.5px] leading-snug text-muted">
              <ClockIcon />
              <span>{logging("stairNote")}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className={`mb-1.5 grid ${setCols} gap-2 px-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-2`}
          >
            <span className="text-center">{t("set")}</span>
            {showPrevious && <span className="text-center">{t("previous")}</span>}
            <span className="text-center">{t("kg")}</span>
            <span className="text-center">{t("reps")}</span>
            <span />
          </div>
          {exercise.sets.map((s, i) => {
            const prevS = previousSets?.[i];
            return (
              <SwipeToDelete key={i} onDelete={() => removeSet(i)} className="mb-1.5 rounded-lg">
                <div
                  className={`grid ${setCols} items-center gap-2 rounded-lg px-1 py-1 ${
                    s.warmup ? "opacity-60" : ""
                  } ${s.done ? "bg-green/20" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleWarmup(i)}
                    className={`text-center text-xs font-bold ${
                      s.warmup ? "text-orange" : "text-muted-2"
                    }`}
                    aria-label={s.warmup ? t("warmupOn") : t("warmupOff")}
                  >
                    {s.warmup ? t("warmupMark") : workingSetNumber[i]}
                  </button>
                  {showPrevious && (
                    <span className="truncate text-center text-[13px] text-muted-2">
                      {prevS ? `${prevS.weight || 0}kg × ${prevS.reps || 0}` : "–"}
                    </span>
                  )}
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    placeholder={prevS?.weight ?? "–"}
                    value={s.weight ?? ""}
                    onChange={(e) => updateSet(i, { weight: e.target.value })}
                    className={`w-full min-w-0 rounded-xl border px-2 py-2.5 text-center text-base outline-none focus:border-blue ${
                      s.done ? "border-green bg-green text-[#04310F]" : "border-surface-2 bg-surface-2 text-ink"
                    }`}
                  />
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder={prevS?.reps ?? (mode === "routine" ? "10" : "–")}
                    value={s.reps ?? ""}
                    onChange={(e) => updateSet(i, { reps: e.target.value })}
                    className={`w-full min-w-0 rounded-xl border px-2 py-2.5 text-center text-base outline-none focus:border-blue ${
                      s.done ? "border-green bg-green text-[#04310F]" : "border-surface-2 bg-surface-2 text-ink"
                    }`}
                  />
                  {mode === "log" ? (
                    <button
                      type="button"
                      onClick={() => toggleDone(i)}
                      className={checkButtonClass(s.done)}
                    >
                      <CheckIcon />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              </SwipeToDelete>
            );
          })}
        </>
      ))}

      {!collapsed && (
        <button
          type="button"
          onClick={addSet}
          className="mt-1 w-full rounded-[10px] bg-surface-2 py-2.5 text-[13px] font-bold text-blue"
        >
          {t("add")}
        </button>
      )}
    </div>
  );
});
SetBlock.displayName = "SetBlock";
