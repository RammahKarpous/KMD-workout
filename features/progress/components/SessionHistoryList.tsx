"use client";

import { usePaginatedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useDateText } from "@/features/i18n/useDateText";
import { intensityKey } from "@/features/logging/intensity";
import { formatDuration } from "@/shared/lib/date";
import { CardioIcon, StrengthIcon } from "@/shared/ui/icons";

export function SessionHistoryList() {
  const t = useTranslations("progress");
  const common = useTranslations("common");
  const { results, status, loadMore } = usePaginatedQuery(
    api.logging.listRecentSessions,
    {},
    { initialNumItems: 20 }
  );

  if (status === "LoadingFirstPage") {
    return <div className="h-32 animate-pulse rounded-card bg-surface" />;
  }

  if (results.length === 0) {
    return (
      <div className="py-8 text-center text-[14px] text-muted-2">
        {t("noSessions")}
      </div>
    );
  }

  return (
    <div>
      {results.map((s) => (
        <SessionRow key={s._id} session={s} />
      ))}
      {status === "CanLoadMore" && (
        <button
          type="button"
          onClick={() => loadMore(20)}
          className="mt-1 w-full rounded-xl bg-surface py-3 text-[13.5px] font-bold text-blue"
        >
          {common("loadMore")}
        </button>
      )}
      {status === "LoadingMore" && (
        <div className="mt-1 h-11 animate-pulse rounded-xl bg-surface" />
      )}
    </div>
  );
}

function SessionRow({ session }: { session: Doc<"sessions"> }) {
  const logging = useTranslations("logging");
  const progress = useTranslations("progress");
  const cardioLabel = useTranslations("cardio");
  const intensityLabel = useTranslations("intensity");
  const dates = useDateText();
  const isStrength = session.type === "strength";
  const title = isStrength
    ? (session.routineName ?? logging("defaultTitle"))
    : session.cardioType
      ? cardioLabel(session.cardioType as "Walking")
      : logging("cardio");

  let desc: string;
  if (isStrength) {
    const exercises = session.exercises ?? [];
    const setCount = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => !s.warmup).length,
      0
    );
    desc = [
      session.durationSec ? formatDuration(session.durationSec) : null,
      progress("exerciseCount", { count: exercises.length }),
      progress("setCount", { count: setCount }),
    ]
      .filter(Boolean)
      .join(" · ");
  } else {
    desc = `${logging("minutesValue", { count: session.duration ?? 0 })} · ${
      session.intensity ? intensityLabel(intensityKey(session.intensity)) : ""
    }`;
  }

  return (
    <Link
      href={`/sessions/${session._id}`}
      className="mb-2 flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3"
    >
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
          isStrength ? "bg-blue-dim text-blue" : "bg-orange/[0.15] text-orange"
        }`}
      >
        <span className="h-5 w-5 [&_svg]:h-5 [&_svg]:w-5">
          {isStrength ? <StrengthIcon /> : <CardioIcon />}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-bold text-ink">{title}</div>
        <div className="truncate text-[12px] text-muted-2">
          {dates.formatDate(session.ts)} &middot; {desc}
        </div>
      </div>
      <span className="text-lg text-muted-2">&rsaquo;</span>
    </Link>
  );
}
