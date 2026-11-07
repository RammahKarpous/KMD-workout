"use client";

import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CARDIO } from "@/features/exercises/library/library";
import { intensityKey } from "@/features/logging/intensity";
import { Chip } from "@/shared/ui/Chip";
import { ClockIcon } from "@/shared/ui/icons";
import { SheetHeader } from "@/shared/ui/SheetHeader";
import { useSheet } from "@/shared/ui/SheetHost";
import { WorkoutSummaryScreen } from "./WorkoutSummaryScreen";

const INTENSITIES = ["Easy (conversational)", "Moderate", "Hard"] as const;

export function ActiveCardioScreen() {
  const { closeAll } = useSheet();
  const t = useTranslations("logging");
  const cardioLabel = useTranslations("cardio");
  const intensityLabel = useTranslations("intensity");
  const finishCardioSession = useMutation(api.logging.finishCardioSession);
  const updateSessionNotes = useMutation(api.logging.updateSessionNotes);

  const [startTs] = useState(() => Date.now());
  const [cardioType, setCardioType] = useState(CARDIO[0]);
  const [duration, setDuration] = useState("25");
  const [intensity, setIntensity] = useState<(typeof INTENSITIES)[number]>(INTENSITIES[0]);
  const [phase, setPhase] = useState<"log" | "summary">("log");
  const [notes, setNotes] = useState("");
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [finishing, setFinishing] = useState(false);

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    const id = await finishCardioSession({
      cardioType,
      duration: Number(duration) || 0,
      intensity,
      ts: startTs,
    });
    setSessionId(id);
    setFinishing(false);
    setPhase("summary");
  }

  function commitNotes() {
    if (sessionId) updateSessionNotes({ id: sessionId, notes });
  }

  if (phase === "summary") {
    return (
      <WorkoutSummaryScreen
        title={cardioType}
        stats={[
          { label: t("duration"), value: t("minutesValue", { count: Number(duration) || 0 }), accent: true },
          { label: t("type"), value: cardioLabel(cardioType as "Walking") },
          { label: t("intensity"), value: intensityLabel(intensityKey(intensity)) },
        ]}
        notes={notes}
        onNotesChange={setNotes}
        onNotesBlur={commitNotes}
        onDone={closeAll}
      />
    );
  }

  return (
    <div className="p-4">
      <SheetHeader
        title={t("cardio")}
        onClose={closeAll}
        right={
          <button
            type="button"
            onClick={handleFinish}
            disabled={finishing}
            className="text-[15px] font-bold text-blue disabled:opacity-50"
          >
            {t("finish")}
          </button>
        }
      />

      <div className="mb-4">
        <label className="mb-2 block text-[12.5px] font-semibold text-muted">
          {t("whatDoing")}
        </label>
        <div className="flex flex-wrap gap-2">
          {CARDIO.map((c) => (
            <Chip key={c} active={c === cardioType} onClick={() => setCardioType(c)}>
              {cardioLabel(c as "Walking")}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">
          {t("durationMinutes")}
        </label>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none focus:border-blue"
        />
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-[12.5px] font-semibold text-muted">
          {t("intensity")}
        </label>
        <div className="flex flex-wrap gap-2">
          {INTENSITIES.map((l) => (
            <Chip key={l} small active={l === intensity} onClick={() => setIntensity(l)}>
              {intensityLabel(intensityKey(l))}
            </Chip>
          ))}
        </div>
      </div>

      {cardioType === "StairMaster" && (
        <div className="mt-3 flex gap-3 rounded-card border border-line bg-surface p-4 text-[13.5px] leading-snug text-muted">
          <ClockIcon />
          <span>{t("stairNote")}</span>
        </div>
      )}
    </div>
  );
}
