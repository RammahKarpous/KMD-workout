"use client";

import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { parseDateInputValue, toDateInputValue } from "@/shared/lib/date";

/** Quick weigh-in log, kept separate from the less-frequent body
 * measurements card below — weighing in weekly shouldn't require scrolling
 * past fields (thighs, waist, ...) you only fill in occasionally. */
export function WeightLogCard({ entries }: { entries: Doc<"measurements">[] | undefined }) {
  const upsert = useMutation(api.measurements.upsert);
  const t = useTranslations("stats");
  const common = useTranslations("common");
  const bmi = useTranslations("bmi");

  const [date, setDate] = useState(() => toDateInputValue());
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ts = parseDateInputValue(date);
  const existing = entries?.find((e) => e.ts === ts) ?? null;

  useEffect(() => {
    setWeight(existing?.weight?.toString() ?? "");
  }, [existing]);

  async function save() {
    setError(null);
    const n = Number(weight.trim());
    if (weight.trim() === "" || !Number.isFinite(n) || n <= 0) {
      setError(bmi("weightInvalid"));
      return;
    }
    await upsert({ ts, weight: n });
  }

  return (
    <div className="mb-4 rounded-card bg-surface p-4">
      <div className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-muted">{t("weight")}</div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">{t("date")}</label>
      <input
        type="date"
        value={date}
        max={toDateInputValue()}
        onChange={(e) => setDate(e.target.value)}
        className="mb-3.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-base text-ink outline-none focus:border-blue"
      />

      <div className="flex items-end gap-2.5">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">
            {t("weightKg")}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full min-w-0 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-base text-ink outline-none focus:border-blue"
          />
        </div>
        <button
          type="button"
          onClick={save}
          className="flex-none rounded-xl bg-blue px-5 py-3 text-[14px] font-bold text-white"
        >
          {existing?.weight !== undefined ? common("update") : common("save")}
        </button>
      </div>
      {error && <p className="mt-2.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
