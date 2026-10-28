"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { epley1RM } from "@/shared/lib/epley";
import { useDateText } from "@/features/i18n/useDateText";
import { BackIcon } from "@/shared/ui/icons";
import { Chip } from "@/shared/ui/Chip";
import { SetTable } from "@/shared/ui/SetTable";
import { exInfo } from "../library/exInfo";
import { CARDIO } from "../library/library";
import { useExerciseHistory } from "../hooks/useExerciseHistory";
import { BodyMap } from "./BodyMap";
import { ExerciseThumb } from "./ExerciseThumb";

type Tab = "summary" | "history" | "muscles";
const TABS: { id: Tab; label: "summary" | "history" | "muscles" }[] = [
  { id: "summary", label: "summary" },
  { id: "history", label: "history" },
  { id: "muscles", label: "muscles" },
];

const TAXONOMY_KEYS = new Set([
  "Upper body",
  "Posterior chain",
  "Full body",
  "Lower body",
  "Core",
  "Neck",
  "Custom",
  "Push",
  "Pull",
  "Hinge",
  "Squat",
  "Isolation",
  "Carry",
  "Olympic",
]);

function labelTaxonomy(t: (key: "Core") => string, value: string): string {
  return TAXONOMY_KEYS.has(value) ? t(value as "Core") : value;
}

function prRow(label: string, value: string) {
  return (
    <div key={label} className="flex items-center justify-between border-b border-line py-3">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="text-[15px] font-bold text-ink">{value}</span>
    </div>
  );
}

/**
 * Exercise detail: Summary (PRs or cardio totals) / History (every past
 * session) / Muscles (region + BodyMap roles). Used both as the real
 * `/exercises/[name]` route (deep-linkable) and pushed as a stacked sheet
 * from inside live logging / the routine editor — in the sheet case
 * `onBack` is the sheet's `pop`, preserving the in-progress draft
 * underneath instead of losing it to a full navigation.
 */
export function ExerciseDetailTabs({
  name,
  onBack,
}: {
  name: string;
  onBack?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("exercises");
  const common = useTranslations("common");
  const cardio = useTranslations("cardio");
  const [tab, setTab] = useState<Tab>("summary");
  const history = useExerciseHistory(name);
  const customExercises = useQuery(api.exercises.listCustomExercises) ?? [];

  const isCardio = CARDIO.includes(name);
  const customByName = Object.fromEntries(
    customExercises.map((c) => [c.name, { primaryMuscle: c.primaryMuscle }])
  );

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => (onBack ? onBack() : router.back())}
        className="mb-2 -ml-1.5 flex items-center gap-1 rounded-lg px-1.5 py-2 text-[15px] font-semibold text-muted"
      >
        <BackIcon />
        {common("back")}
      </button>

      <div className="mb-4 flex items-center gap-3">
        <ExerciseThumb name={name} />
        <h1 className="text-[22px] font-extrabold tracking-tight">
          {isCardio ? cardio(name as "Walking") : name}
        </h1>
      </div>

      <div className="mb-4 flex gap-2">
        {TABS.map((item) => (
          <Chip key={item.id} small active={tab === item.id} onClick={() => setTab(item.id)}>
            {t(item.label)}
          </Chip>
        ))}
      </div>

      {tab === "summary" && (
        <SummaryTab isCardio={isCardio} history={history} />
      )}
      {tab === "history" && <HistoryTab history={history} />}
      {tab === "muscles" && (
        <MusclesTab name={name} customByName={customByName} />
      )}
    </div>
  );
}

function SummaryTab({
  isCardio,
  history,
}: {
  isCardio: boolean;
  history: ReturnType<typeof useExerciseHistory>;
}) {
  const t = useTranslations("exercises");
  if (history === undefined) {
    return <div className="h-32 animate-pulse rounded-card bg-surface" />;
  }

  const { matches, scannedAll } = history;

  if (isCardio) {
    let longest = 0;
    let totalMin = 0;
    for (const m of matches) {
      for (const s of m.sets) {
        const min = Number(s.min) || 0;
        if (min > longest) longest = min;
        totalMin += min;
      }
    }
    return (
      <div>
        {prRow(t("sessionsLogged"), `${matches.length}`)}
        {prRow(t("longestSession"), longest ? t("minutesValue", { count: longest }) : "–")}
        {prRow(t("totalTime"), totalMin ? t("minutesValue", { count: totalMin }) : "–")}
        {!scannedAll && (
          <p className="mt-3 text-[12px] text-muted-2">
            {t("recent")}
          </p>
        )}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="py-8 text-center text-[14px] text-muted-2">
        <span className="mb-1.5 block text-lg font-bold text-muted">
          {t("noRecords")}
        </span>
        {t("noRecordsBody")}
      </div>
    );
  }

  let heaviest = 0;
  let best1rm = 0;
  let bestSetVol = 0;
  const sessionVolumes = new Map<string, number>();
  for (const m of matches) {
    let sessVol = sessionVolumes.get(m.sessionId) ?? 0;
    for (const s of m.sets) {
      if (s.warmup) continue;
      const w = Number(s.weight) || 0;
      const reps = Number(s.reps) || 0;
      if (w > heaviest) heaviest = w;
      if (w > 0 && reps > 0) {
        const orm = epley1RM(w, reps);
        if (orm > best1rm) best1rm = orm;
        const sv = w * reps;
        if (sv > bestSetVol) bestSetVol = sv;
        sessVol += sv;
      }
    }
    sessionVolumes.set(m.sessionId, sessVol);
  }
  const bestSessVol = Math.max(0, ...sessionVolumes.values());

  return (
    <div>
      <div className="mb-1 mt-1 text-[12.5px] font-bold uppercase tracking-wide text-muted">
        {t("records")}
      </div>
      {prRow(t("heaviest"), heaviest ? t("kgValue", { amount: heaviest }) : "–")}
      {prRow(t("best1rm"), best1rm ? t("kgValue", { amount: Math.round(best1rm * 10) / 10 }) : "–")}
      {prRow(t("bestSetVolume"), bestSetVol ? t("kgValue", { amount: Math.round(bestSetVol * 10) / 10 }) : "–")}
      {prRow(t("bestSessionVolume"), bestSessVol ? t("kgValue", { amount: Math.round(bestSessVol * 10) / 10 }) : "–")}
      {prRow(t("timesLogged"), `${matches.length}`)}
      {!scannedAll && (
        <p className="mt-3 text-[12px] text-muted-2">
          {t("recent")}
        </p>
      )}
    </div>
  );
}

function HistoryTab({
  history,
}: {
  history: ReturnType<typeof useExerciseHistory>;
}) {
  const t = useTranslations("exercises");
  const logging = useTranslations("logging");
  const dates = useDateText();
  if (history === undefined) {
    return <div className="h-32 animate-pulse rounded-card bg-surface" />;
  }

  if (history.matches.length === 0) {
    return (
      <div className="py-8 text-center text-[14px] text-muted-2">
        <span className="mb-1.5 block text-lg font-bold text-muted">
          {t("noHistory")}
        </span>
        {t("noHistoryBody")}
      </div>
    );
  }

  return (
    <div>
      {history.matches.map((m) => (
        <Link
          key={`${m.sessionId}-${m.ts}`}
          href={`/sessions/${m.sessionId}`}
          className="mb-4 block"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[14.5px] font-bold text-ink">
              {m.routineName ?? logging("defaultTitle")}
            </span>
            <span className="text-[12px] text-muted-2">
              {dates.formatFullDate(m.ts)}
            </span>
          </div>
          <SetTable sets={m.sets} cardio={m.cardio} />
        </Link>
      ))}
    </div>
  );
}

function MusclesTab({
  name,
  customByName,
}: {
  name: string;
  customByName: Record<string, { primaryMuscle: string }>;
}) {
  const t = useTranslations("exercises");
  const muscles = useTranslations("muscles");
  const taxonomy = useTranslations("taxonomy");
  const info = exInfo(name, customByName);

  return (
    <div>
      {info && (
        <div className="mb-1 text-center text-[13px] text-muted-2">
          {labelTaxonomy(taxonomy, info.region)} &middot; {labelTaxonomy(taxonomy, info.mv)} &middot;{" "}
          {info.t === "compound" ? t("compound") : info.t === "isolation" ? t("isolation") : "—"}
        </div>
      )}
      <BodyMap mode="roles" primary={info?.p ?? []} secondary={info?.s ?? []} />

      {info && info.p.length > 0 && (
        <>
          <div className="mb-2 mt-4 text-[12.5px] font-bold uppercase tracking-wide text-muted">
            {t("primary")}
          </div>
          <div className="mb-2 flex flex-wrap gap-2">
            {info.p.map((id) => (
              <span
                key={id}
                className="rounded-full bg-blue px-3.5 py-1.5 text-[13px] font-semibold text-white"
              >
                {muscles(id as "chest")}
              </span>
            ))}
          </div>
        </>
      )}

      {info && info.s.length > 0 && (
        <>
          <div className="mb-2 mt-4 text-[12.5px] font-bold uppercase tracking-wide text-muted">
            {t("secondary")}
          </div>
          <div className="flex flex-wrap gap-2">
            {info.s.map((id) => (
              <span
                key={id}
                className="rounded-full border border-orange bg-orange/[0.18] px-3.5 py-1.5 text-[13px] font-semibold text-orange"
              >
                {muscles(id as "chest")}
              </span>
            ))}
          </div>
        </>
      )}

      {!info && (
        <div className="mt-4 text-center text-[13px] text-muted-2">
          {t("noMuscle")}
        </div>
      )}
    </div>
  );
}
