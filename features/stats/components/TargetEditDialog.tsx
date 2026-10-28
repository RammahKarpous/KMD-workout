"use client";

import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/convex/_generated/api";

export function TargetEditDialog({
  group,
  initialMin,
  initialMax,
  onClose,
}: {
  group: string;
  initialMin: number;
  initialMax: number;
  onClose: () => void;
}) {
  const setTarget = useMutation(api.stats.setTarget);
  const t = useTranslations("stats");
  const common = useTranslations("common");
  const groups = useTranslations("groups");
  const [min, setMin] = useState(String(initialMin));
  const [max, setMax] = useState(String(initialMax));

  const save = async () => {
    const mn = Math.max(0, Number(min) || 0);
    const mx = Math.max(mn, Number(max) || mn);
    await setTarget({ group, min: mn, max: mx });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/62 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-85 rounded-2xl border border-line bg-surface p-5.5">
        <p className="mb-4 text-base font-bold text-ink">
          {t("weeklyTarget", { group: groups(group as "Glutes") })}
        </p>
        <div className="mb-5 flex gap-2.5">
          <label className="flex-1">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-2">
              {t("min")}
            </div>
            <input
              type="number"
              min={0}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2.5 text-base text-ink outline-none focus:border-blue"
            />
          </label>
          <label className="flex-1">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-2">
              {t("max")}
            </div>
            <input
              type="number"
              min={0}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className="w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2.5 text-base text-ink outline-none focus:border-blue"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] bg-surface-2 px-4.5 py-2.75 text-sm font-bold text-ink"
          >
            {common("cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-[10px] bg-blue px-4.5 py-2.75 text-sm font-bold text-white"
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
