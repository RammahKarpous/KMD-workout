"use client";

import { useTranslations } from "next-intl";
import { useDateText } from "@/features/i18n/useDateText";

export function WeekNav({
  weekStartTs,
  offset,
  onOffsetChange,
}: {
  weekStartTs: number;
  offset: number;
  onOffsetChange: (next: number) => void;
}) {
  const t = useTranslations("stats");
  const dates = useDateText();
  const title =
    offset === 0 ? t("thisWeek") : offset === -1 ? t("lastWeek") : t("weeksAgo", { count: Math.abs(offset) });

  return (
    <div className="mb-4 flex items-center justify-between rounded-card bg-surface px-3 py-3">
      <button
        type="button"
        aria-label={t("previousWeek")}
        onClick={() => onOffsetChange(offset - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-ink active:bg-surface-2"
      >
        &#8592;
      </button>
      <div className="text-center">
        <div className="text-[14px] font-bold text-ink">{title}</div>
        <div className="text-[12px] text-muted-2">{dates.formatWeekRange(weekStartTs)}</div>
      </div>
      <button
        type="button"
        aria-label={t("nextWeek")}
        disabled={offset >= 0}
        onClick={() => onOffsetChange(offset + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-ink disabled:opacity-30 active:bg-surface-2"
      >
        &#8594;
      </button>
    </div>
  );
}
