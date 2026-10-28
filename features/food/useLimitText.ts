"use client";

import { useTranslations } from "next-intl";
import { formatDiaryNumber, limitReadout } from "./diary/diaryModel";

export function useLimitText() {
  const t = useTranslations("food.meter");
  return (label: string, value: number, limit: number, unit: string) => {
    const readout = limitReadout(value, limit);
    const detail = readout.over
      ? t("overBy", { amount: formatDiaryNumber(readout.overBy), unit })
      : readout.atLimit
        ? t("atLimit")
        : t("remaining", { amount: formatDiaryNumber(readout.remaining), unit });
    const valuetext = t("meterText", {
      label,
      value: formatDiaryNumber(value),
      limit: formatDiaryNumber(Math.max(limit, 0)),
      unit,
      detail,
    });
    return { ...readout, detail, valuetext };
  };
}
