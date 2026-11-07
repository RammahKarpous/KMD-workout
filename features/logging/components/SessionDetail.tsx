"use client";

import { useMutation, usePreloadedQuery, useQuery, type Preloaded } from "convex/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { ExerciseThumb } from "@/features/exercises/components/ExerciseThumb";
import { MusclePanel } from "@/features/exercises/components/MusclePanel";
import { SessionEditorSheet } from "@/features/logging/editors/SessionEditorSheet";
import { intensityKey } from "@/features/logging/intensity";
import { useDateText } from "@/features/i18n/useDateText";
import { formatDuration } from "@/shared/lib/date";
import { computeSessionVolume } from "@/shared/lib/volume";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { BackIcon, TrashIcon } from "@/shared/ui/icons";
import { useSheet } from "@/shared/ui/SheetHost";
import { SetTable } from "@/shared/ui/SetTable";

export function SessionDetail({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.logging.getSession>;
}) {
  const session = usePreloadedQuery(preloaded);
  const customExercises = useQuery(api.exercises.listCustomExercises) ?? [];
  const deleteSession = useMutation(api.logging.deleteSession);
  const router = useRouter();
  const { push } = useSheet();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const t = useTranslations("logging");
  const common = useTranslations("common");
  const cardioLabel = useTranslations("cardio");
  const intensityLabel = useTranslations("intensity");
  const dates = useDateText();

  if (!session) {
    return (
      <div className="pt-10 text-center text-sm text-muted-2">
        {t("sessionNotFound")}
      </div>
    );
  }

  const customByName = Object.fromEntries(
    customExercises.map((c) => [c.name, { primaryMuscle: c.primaryMuscle }])
  );
  const title =
    session.type === "strength"
      ? (session.routineName ?? t("defaultTitle"))
      : (session.cardioType ? cardioLabel(session.cardioType as "Walking") : t("cardio"));
  const hasMuscleData =
    session.type === "strength" &&
    (session.exercises ?? []).some((ex) => !ex.cardio);
  const volume =
    session.type === "strength"
      ? computeSessionVolume(session.exercises ?? [])
      : 0;

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-2 -ml-1.5 flex items-center gap-1 rounded-lg px-1.5 py-2 text-[15px] font-semibold text-muted"
      >
        <BackIcon />
        {common("back")}
      </button>

      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-[24px] font-extrabold tracking-tight">{title}</h1>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => push("session-editor", <SessionEditorSheet session={session} />)}
            className="rounded-lg px-2 py-2 text-sm font-bold text-blue cursor-pointer"
          >
            {t("edit")}
          </button>
          <button
            type="button"
            aria-label={t("deleteSession")}
            onClick={() => setConfirmingDelete(true)}
            className="rounded-lg p-3 text-danger cursor-pointer"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      <div className="mb-5 text-[13px] text-muted-2">
        {dates.formatFullDate(session.ts)}
        {session.durationSec ? ` · ${formatDuration(session.durationSec)}` : ""}
        {volume > 0 ? ` · ${t("volumeLine", { amount: Math.round(volume * 10) / 10 })}` : ""}
      </div>

      {session.type === "strength" ? (
        (session.exercises ?? []).map((ex, i) => (
          <div key={i} className="mb-6">
            <button
              type="button"
              onClick={() => router.push(`/exercises/${encodeURIComponent(ex.name)}`)}
              className="mb-2 flex items-center gap-3"
            >
              <ExerciseThumb name={ex.name} />
              <span className="text-[15.5px] font-bold tracking-tight">
                {ex.name}
              </span>
            </button>
            {ex.notes && (
              <p className="mb-2 text-[12.5px] text-muted-2">{ex.notes}</p>
            )}
            <SetTable sets={ex.sets} cardio={ex.cardio} />
          </div>
        ))
      ) : (
        <div className="mb-6 rounded-card bg-surface p-4">
          <button
            type="button"
            onClick={() =>
              router.push(`/exercises/${encodeURIComponent(session.cardioType ?? "")}`)
            }
            className="mb-2 flex items-center gap-3"
          >
            <ExerciseThumb name={session.cardioType ?? ""} />
            <span className="text-[15.5px] font-bold tracking-tight">
              {session.cardioType ? cardioLabel(session.cardioType as "Walking") : session.cardioType}
            </span>
          </button>
          <div className="text-[14px] text-ink">
            {t("minutesValue", { count: session.duration ?? 0 })} ·{" "}
            {session.intensity ? intensityLabel(intensityKey(session.intensity)) : ""}
          </div>
        </div>
      )}

      {session.notes && (
        <>
          <div className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-muted">
            {t("note")}
          </div>
          <p className="mb-6 text-[14px] leading-snug text-muted">
            {session.notes}
          </p>
        </>
      )}

      {hasMuscleData && (
        <>
          <div className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-muted">
            {t("musclesWorked")}
          </div>
          <MusclePanel
            exercises={session.exercises ?? []}
            customExercisesByName={customByName}
          />
        </>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        danger
        message={t("deleteSessionConfirm", { name: title })}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={async () => {
          setConfirmingDelete(false);
          await deleteSession({ id: session._id });
          router.back();
        }}
      />
    </div>
  );
}
