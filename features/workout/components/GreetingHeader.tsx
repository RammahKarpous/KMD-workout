"use client";

import { useTranslations } from "next-intl";
import { useDateText } from "@/features/i18n/useDateText";
import { Skeleton } from "@/shared/ui/Skeleton";
import { MonthOverview } from "./MonthOverview";

export function GreetingHeader({
  sessionsThisWeek,
}: {
  sessionsThisWeek: number | undefined;
}) {
  const t = useTranslations("workout");
  const dates = useDateText();
  const sub =
    sessionsThisWeek === undefined
      ? undefined
      : sessionsThisWeek === 0
        ? t("noneThisWeek")
        : sessionsThisWeek === 1
          ? t("oneThisWeek")
          : t("manyThisWeek", { count: sessionsThisWeek });

  return (
    <div className="rounded-card bg-surface p-5">
      <h2 className="text-[23px] font-bold">{dates.greeting()}.</h2>
      {sub === undefined ? (
        <Skeleton className="mt-1.5 h-4 w-40" />
      ) : (
        <p className="mt-1 text-sm text-muted">{sub}</p>
      )}
      <MonthOverview />
    </div>
  );
}
