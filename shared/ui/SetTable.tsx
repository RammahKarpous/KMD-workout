"use client";

import { useTranslations } from "next-intl";

/** Read-only set table: target sets (routine detail) or logged sets
 * (session detail) — same rendering either way, just weight/reps or
 * minutes per row. */
export function SetTable({
  sets,
  cardio,
}: {
  sets: { weight?: string; reps?: string; min?: string; warmup?: boolean }[];
  cardio: boolean;
}) {
  const t = useTranslations("sets");
  const cols = cardio ? "grid-cols-[52px_1fr]" : "grid-cols-[52px_1fr_1fr]";

  // Working sets are numbered on their own — warm-ups don't take a number,
  // so the first real set always starts at 1 regardless of how many
  // warm-ups come before it (matches SetBlock's numbering while editing).
  let workingCount = 0;
  const workingSetNumber = sets.map((s) => (s.warmup ? null : ++workingCount));

  return (
    <div>
      <div
        className={`mb-1.5 grid ${cols} px-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-2`}
      >
        <span>{t("set")}</span>
        <span>{cardio ? t("minutes") : t("kg")}</span>
        {!cardio && <span>{t("reps")}</span>}
      </div>
      {sets.map((s, i) => (
        <div
          key={i}
          className={`grid ${cols} items-center rounded-lg px-1.5 py-3.5 text-base ${
            i % 2 === 1 ? "bg-surface" : ""
          } ${s.warmup ? "opacity-60" : ""}`}
        >
          <span className={`font-bold ${s.warmup ? "text-orange" : "text-ink"}`}>
            {s.warmup ? t("warmupMark") : workingSetNumber[i]}
          </span>
          {cardio ? (
            <span className="text-muted">{s.min || "–"}</span>
          ) : (
            <>
              <span className="text-muted">{s.weight || "–"}</span>
              <span className="text-muted">{s.reps || "–"}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
