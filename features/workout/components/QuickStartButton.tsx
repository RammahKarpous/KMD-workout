"use client";

import { useTranslations } from "next-intl";
import { StrengthIcon } from "@/shared/ui/icons";

export function QuickStartButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("workout");
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-0.5 flex w-full items-center justify-center gap-3 rounded-card bg-blue px-4 py-4.5 text-white"
    >
      <StrengthIcon />
      <span className="text-[16px] font-bold tracking-tight">{t("quickStart")}</span>
    </button>
  );
}
