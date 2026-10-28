"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  formatDate,
  formatFullDate,
  formatMonthTitle,
  formatShortDate,
  formatWeekRange,
} from "@/shared/lib/date";

export function useDateText() {
  const locale = useLocale();
  const t = useTranslations("dates");
  const labels = { today: t("today"), yesterday: t("yesterday") };

  return {
    greeting() {
      const hour = new Date().getHours();
      if (hour < 6) return t("stillUp");
      if (hour < 12) return t("goodMorning");
      if (hour < 18) return t("goodAfternoon");
      return t("goodEvening");
    },
    formatDate: (ts: number) => formatDate(ts, locale, labels),
    formatShortDate: (ts: number) => formatShortDate(ts, locale),
    formatFullDate: (ts: number) => formatFullDate(ts, locale),
    formatWeekRange: (ts: number) => formatWeekRange(ts, locale),
    formatMonthTitle: (ts: number) => formatMonthTitle(ts, locale),
  };
}
